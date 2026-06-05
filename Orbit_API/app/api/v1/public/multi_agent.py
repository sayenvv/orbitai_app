"""Deprecated — use POST /api/chat/message/stream (single SSE orchestration endpoint)."""

from fastapi import APIRouter, Depends, Request

from app.api.v1.public.auth import require_chat_user
from app.db.session import get_db
from app.models import User
from app.schemas import MultiAgentStartRequest, StreamMessageRequest
from app.services.multi_agent_stream import chat_streaming_response
from sqlalchemy.orm import Session

router = APIRouter(prefix="/multi-agent", tags=["multi-agent"])


@router.post("/runs/stream")
async def start_multi_agent_run_stream(
    body: MultiAgentStartRequest,
    request: Request,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    """Backward-compatible alias for POST /api/chat/message/stream."""
    stream_body = StreamMessageRequest(
        message=body.task,
        conversation_id=body.conversation_id,
        agent_id=body.agent_id,
        app_slug=body.app_slug,
        source_id=body.source_id,
    )
    return chat_streaming_response(db, user, stream_body, request)
