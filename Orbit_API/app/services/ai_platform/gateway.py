"""Gateway layer — loads user/chat context and delegates to the workflow orchestrator."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.orm import Session

from app.models import Conversation, User
from app.orchestration.runner import load_conversation_history
from app.services.ai_platform.static_fast_path import is_static_fast_path_prompt
from app.services.ai_platform.stores.config_store import ensure_default_platform_configs
from app.services.ai_platform.types import StreamEvent
from app.services.ai_platform.workflow.orchestrator import WorkflowOrchestrator
from app.services.token_usage import can_consume, ensure_current_period, estimate_tokens


class PlatformGateway:
    def __init__(self) -> None:
        self.orchestrator = WorkflowOrchestrator()

    async def stream_project_generation(
        self,
        db: Session,
        *,
        user: User,
        prompt: str,
        conversation_id: uuid.UUID | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        ensure_default_platform_configs(db)
        ensure_current_period(db, user)

        enriched_prompt = prompt.strip()
        if conversation_id:
            conv = (
                db.query(Conversation)
                .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
                .first()
            )
            if conv:
                history = load_conversation_history(db, conv.id)
                if history:
                    tail = history[-6:]
                    lines = [f"{role}: {content}" for role, content in tail]
                    enriched_prompt = (
                        "Conversation context:\n"
                        + "\n".join(lines)
                        + f"\n\nLatest request:\n{prompt.strip()}"
                    )

        estimated_tokens = 6000 if is_static_fast_path_prompt(enriched_prompt) else max(
            8000, estimate_tokens(enriched_prompt) * 100
        )
        if not can_consume(user, estimated_tokens):
            yield StreamEvent(
                type="error",
                stage="intent_classification",
                message="Monthly token limit reached. Upgrade your plan or wait for the next billing period.",
                payload={"estimated_tokens": estimated_tokens},
            ).to_sse()
            return

        async for event in self.orchestrator.run_project_generation(
            db,
            user=user,
            prompt=enriched_prompt,
            estimated_tokens=estimated_tokens,
        ):
            yield event
