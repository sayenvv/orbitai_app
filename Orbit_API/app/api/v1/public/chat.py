import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.api.v1.public.auth import require_chat_user
from app.db.session import get_db
from app.models import Agent, Conversation, Message, User
from app.orchestration.runner import (
    get_or_create_conversation,
    load_conversation_history,
    save_message,
    stream_agent_response,
)
from app.schemas import (
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationSummary,
    CreateConversationRequest,
    MessageResponse,
    StreamMessageRequest,
    TokenUsageResponse,
)
from app.services.agent_registry import AgentRegistry
from app.services.token_usage import (
    can_consume,
    ensure_current_period,
    estimate_tokens,
    estimate_turn_tokens,
    get_usage_snapshot,
    record_usage,
)

router = APIRouter(prefix="/chat", tags=["chat"])


def _resolve_agent_uuid(registry: AgentRegistry, agent_slug: str | None) -> UUID | None:
    if not agent_slug:
        return None
    config = registry.get_by_slug(agent_slug)
    return config.agent_id if config else None


def _conversation_summary(conv: Conversation) -> ConversationSummary:
    agent: Agent | None = conv.agent
    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        agent_id=conv.agent_id,
        agent_slug=agent.slug if agent else None,
        agent_name=agent.name if agent else None,
        agent_short_name=agent.short_name if agent else None,
        icon_key=agent.icon_key if agent else None,
        color_key=agent.color_key if agent else None,
    )


@router.post("/conversations", response_model=ConversationSummary)
def create_conversation(
    body: CreateConversationRequest,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    registry = AgentRegistry(db)
    agent_uuid = _resolve_agent_uuid(registry, body.agent_id)

    conv = Conversation(
        user_id=user.id,
        agent_id=agent_uuid,
        title=body.title[:512],
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    conv = (
        db.query(Conversation)
        .options(joinedload(Conversation.agent))
        .filter(Conversation.id == conv.id)
        .first()
    )
    assert conv is not None
    return _conversation_summary(conv)


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None, max_length=200),
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Conversation)
        .options(joinedload(Conversation.agent))
        .filter(Conversation.user_id == user.id)
    )
    if q and q.strip():
        term = q.strip().replace("%", "").replace("_", "")
        if term:
            query = query.filter(Conversation.title.ilike(f"%{term}%"))
    rows = (
        query.order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit + 1)
        .all()
    )
    has_more = len(rows) > limit
    page = rows[:limit]
    next_offset = offset + len(page) if has_more else None
    return ConversationListResponse(
        data=[_conversation_summary(r) for r in page],
        has_more=has_more,
        next_offset=next_offset,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: UUID,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = [
        MessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            timestamp=m.created_at,
        )
        for m in conv.messages
    ]
    return ConversationDetailResponse(messages=messages)


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: UUID,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"ok": True}


@router.post("/message/stream")
async def stream_message(
    body: StreamMessageRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    registry = AgentRegistry(db)

    history: list[tuple[str, str]] = []
    conv: Conversation | None = None
    agent_slug: str | None = body.agent_id or None

    if body.conversation_id:
        conv = (
            db.query(Conversation)
            .options(joinedload(Conversation.agent))
            .filter(Conversation.id == body.conversation_id)
            .first()
        )
        if conv:
            if conv.user_id and conv.user_id != user.id:
                raise HTTPException(status_code=403, detail="Forbidden")
            history = load_conversation_history(db, conv.id)
            if not agent_slug and conv.agent:
                agent_slug = conv.agent.slug

    agent_uuid = _resolve_agent_uuid(registry, agent_slug)

    if conv is None:
        conv = get_or_create_conversation(
            db,
            conversation_id=None,
            user_id=user.id,
            agent_id=agent_uuid,
            title=(body.message[:50] if body.message else "New conversation"),
        )

    assert conv is not None

    ensure_current_period(db, user)
    estimated = estimate_tokens(body.message)
    if not can_consume(user, estimated):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Monthly token limit reached. Upgrade your plan to continue chatting.",
        )

    save_message(db, conv.id, "user", body.message)

    async def event_generator():
        conv_id = str(conv.id)
        yield f"data: {json.dumps({'type': 'start', 'conversation_id': conv_id})}\n\n"

        full = ""
        async for token in stream_agent_response(
            db,
            user_message=body.message,
            agent_slug=agent_slug,
            history=history,
            source_id=body.source_id if body.source_id else None,
            user_id=user.id,
            user_plan=user.plan,
        ):
            full += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        save_message(db, conv.id, "assistant", full)

        turn_tokens = estimate_turn_tokens(user_message=body.message, assistant_message=full)
        snapshot = record_usage(db, user, turn_tokens)
        done_payload: dict = {
            "type": "done",
            "usage": TokenUsageResponse(
                tokens_used=snapshot.tokens_used,
                tokens_limit=snapshot.tokens_limit,
                tokens_remaining=snapshot.tokens_remaining,
                usage_percent=snapshot.usage_percent,
                limit_reached=snapshot.limit_reached,
            ).model_dump(),
        }
        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
