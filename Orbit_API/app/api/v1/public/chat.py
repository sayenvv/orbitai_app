import json
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.api.v1.public.auth import get_current_user, require_user
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
)
from app.services.agent_registry import AgentRegistry

router = APIRouter(prefix="/chat", tags=["chat"])


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
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    registry = AgentRegistry(db)
    agent_config = registry.get_by_slug(body.agent_id) if body.agent_id else registry.get_default()
    agent_uuid = agent_config.agent_id if agent_config else None

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
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Conversation)
        .options(joinedload(Conversation.agent))
        .filter(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
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
    user: User = Depends(require_user),
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
    user: User = Depends(require_user),
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
    user: Annotated[User | None, Depends(get_current_user)] = None,
):
    registry = AgentRegistry(db)
    agent_config = registry.get_by_slug(body.agent_id) if body.agent_id else registry.get_default()
    agent_uuid = agent_config.agent_id if agent_config else None

    history: list[tuple[str, str]] = []
    conv: Conversation | None = None

    if body.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == body.conversation_id).first()
        if conv:
            if user and conv.user_id and conv.user_id != user.id:
                raise HTTPException(status_code=403, detail="Forbidden")
            history = load_conversation_history(db, conv.id)

    if conv is None:
        conv = get_or_create_conversation(
            db,
            conversation_id=None,
            user_id=user.id if user else None,
            agent_id=agent_uuid,
            title=(body.message[:50] if body.message else "New conversation"),
        )

    assert conv is not None
    save_message(db, conv.id, "user", body.message)

    async def event_generator():
        conv_id = str(conv.id)
        yield f"data: {json.dumps({'type': 'start', 'conversation_id': conv_id})}\n\n"

        full = ""
        async for token in stream_agent_response(
            db,
            user_message=body.message,
            agent_slug=body.agent_id,
            history=history,
        ):
            full += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        save_message(db, conv.id, "assistant", full)
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
