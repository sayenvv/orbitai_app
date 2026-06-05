from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from orbit_orchestration.domain.routing import TaskRouting

AgentName = Literal[
    "assistant",
    "web_search_agent",
    "research_agent",
    "job_search_agent",
    "math_agent",
]

SPECIALIST_AGENTS: frozenset[AgentName] = frozenset(
    {
        "web_search_agent",
        "research_agent",
        "job_search_agent",
        "math_agent",
    }
)


class OrchestrationStatus(str, Enum):
    running = "running"
    awaiting_human = "awaiting_human"
    completed = "completed"
    failed = "failed"


@dataclass
class OrchestrationMessage:
    source: AgentName
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class OrchestrationRun:
    session_id: str
    status: OrchestrationStatus
    task: str
    messages: list[OrchestrationMessage] = field(default_factory=list)
    routing: TaskRouting | None = None
    human_prompt: str | None = None
    result: str | None = None
    error: str | None = None
    images: list[dict[str, str]] = field(default_factory=list)
    cards: list[dict[str, Any]] = field(default_factory=list)
