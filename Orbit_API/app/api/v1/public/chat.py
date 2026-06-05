from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload

from app.api.v1.public.auth import require_chat_user
from app.db.session import get_db
from app.models import Agent, Conversation, User
from app.schemas import (
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationSummary,
    CreateConversationRequest,
    MessageResponse,
    StreamMessageRequest,
)
from app.services.agent_registry import AgentRegistry
from app.services.multi_agent_chat import metadata_from_message
from app.services.multi_agent_stream import chat_streaming_response

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
        app_slug=conv.app_slug,
        source_id=conv.source_id,
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
        .options(joinedload(Conversation.messages))
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
            metadata=metadata_from_message(m),
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
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    """Single SSE orchestration endpoint (LangGraph multi-agent + tools)."""
    return chat_streaming_response(db, user, body, request)
