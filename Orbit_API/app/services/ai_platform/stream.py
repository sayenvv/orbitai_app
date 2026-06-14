"""SSE streaming entrypoint with an isolated DB session for long-running workflows."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any

from app.db.session import SessionLocal
from app.models import User
from app.services.ai_platform.gateway import PlatformGateway
from app.services.ai_platform.types import StreamEvent
from app.services.code_workspace.sse import code_workspace_sse_response


async def stream_platform_project_generation(
    user: User,
    *,
    prompt: str,
    conversation_id: uuid.UUID | None = None,
) -> AsyncIterator[dict[str, Any]]:
    user_id = user.id
    db = SessionLocal()
    gateway = PlatformGateway()
    try:
        db_user = db.get(User, user_id)
        if db_user is None:
            yield StreamEvent(
                type="error",
                stage="intent_classification",
                message="User session is invalid.",
            ).to_sse()
            return

        async for event in gateway.stream_project_generation(
            db,
            user=db_user,
            prompt=prompt,
            conversation_id=conversation_id,
        ):
            yield event
    finally:
        db.close()


def platform_sse_response(
    user: User,
    *,
    prompt: str,
    conversation_id: uuid.UUID | None = None,
):
    return code_workspace_sse_response(
        stream_platform_project_generation(user, prompt=prompt, conversation_id=conversation_id)
    )
