from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from orbit_orchestration.domain.routing import TaskRouting
from orbit_orchestration.domain.types import OrchestrationMessage, OrchestrationStatus


@dataclass
class OrchestrationSession:
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    status: OrchestrationStatus = OrchestrationStatus.running
    task: str = ""
    routing: TaskRouting | None = None
    messages: list[OrchestrationMessage] = field(default_factory=list)
    human_prompt: str | None = None
    pending_human_input: str | None = None
    result: str | None = None
    error: str | None = None


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, OrchestrationSession] = {}

    def create(self, task: str) -> OrchestrationSession:
        session = OrchestrationSession(task=task)
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> OrchestrationSession | None:
        return self._sessions.get(session_id)
