from __future__ import annotations

from dataclasses import dataclass, field

from orbit_orchestration.domain.types import AgentName

VALID_AGENTS: frozenset[AgentName] = frozenset(
    {
        "assistant",
        "web_search_agent",
        "research_agent",
        "job_search_agent",
        "math_agent",
    }
)


def is_general_chat(routing: TaskRouting | None) -> bool:
    if routing is None:
        return True
    return routing.primary_agent == "assistant" and not routing.selected_agents


def requires_human_in_loop(routing: TaskRouting | None) -> bool:
    return False


@dataclass
class TaskRouting:
    """Pre-run analysis of the user prompt."""

    primary_agent: AgentName
    selected_agents: list[AgentName]
    intent: str
    topics: list[str] = field(default_factory=list)
    reasoning: str = ""

    def to_task_prefix(self) -> str:
        topics = ", ".join(self.topics) if self.topics else "general"
        agents = ", ".join(self.selected_agents) if self.selected_agents else "assistant"
        return (
            f"[Internal routing only — do not repeat to the user] "
            f"intent={self.intent}; topics={topics}; agents={agents}.\n"
        )
