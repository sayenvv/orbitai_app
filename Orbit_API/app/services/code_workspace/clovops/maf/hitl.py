from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ClovopsHitlSession:
    session_id: str
    user_id: str
    project_id: str
    state: dict[str, Any]
    human_prompt: str
    pending_agent: str
    request_id: str
    workflow_phase: str
    conversation_task: str
    pending_responses: dict[str, Any] = field(default_factory=dict)


class ClovopsHitlStore:
    """In-memory store for paused Clovops MAF workflows awaiting human input."""

    def __init__(self) -> None:
        self._sessions: dict[str, ClovopsHitlSession] = {}

    def create(
        self,
        *,
        user_id: str,
        project_id: str,
        state: dict[str, Any],
        human_prompt: str,
        pending_agent: str,
        request_id: str,
        workflow_phase: str,
        conversation_task: str,
    ) -> ClovopsHitlSession:
        session = ClovopsHitlSession(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
            project_id=project_id,
            state=dict(state),
            human_prompt=human_prompt,
            pending_agent=pending_agent,
            request_id=request_id,
            workflow_phase=workflow_phase,
            conversation_task=conversation_task,
        )
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> ClovopsHitlSession | None:
        return self._sessions.get(session_id)

    def pop(self, session_id: str) -> ClovopsHitlSession | None:
        return self._sessions.pop(session_id, None)


_HITL_STORE = ClovopsHitlStore()


def get_clovops_hitl_store() -> ClovopsHitlStore:
    return _HITL_STORE
