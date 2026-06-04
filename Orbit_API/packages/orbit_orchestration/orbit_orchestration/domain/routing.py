from __future__ import annotations

from dataclasses import dataclass, field

from orbit_orchestration.domain.types import AgentName

VALID_AGENTS: frozenset[AgentName] = frozenset(
    {"summarizer", "image_generator", "human", "assistant"}
)

_SUMMARIZER_INTENTS = frozenset(
    {
        "content_summarization",
        "summarize_then_image",
        "empty_request",
    }
)

_IMAGE_INTENTS = frozenset(
    {
        "image_generation",
        "summarize_then_image",
        "mixed_workflow",
    }
)


def active_specialists(routing: TaskRouting | None) -> set[AgentName]:
    """Specialists that require SelectorGroupChat (not direct assistant)."""
    if routing is None:
        return set()
    specialists: set[AgentName] = set()
    if routing.intent in _SUMMARIZER_INTENTS:
        specialists.add("summarizer")
    if "image_generator" in routing.selected_agents or routing.intent in _IMAGE_INTENTS:
        specialists.add("image_generator")
    return specialists


def is_general_chat(routing: TaskRouting | None) -> bool:
    """Default to direct assistant unless summarization or image workflow."""
    if routing is None:
        return False
    return not active_specialists(routing)


def requires_human_in_loop(routing: TaskRouting | None) -> bool:
    """Human approval is only required for image generation workflows."""
    if routing is None:
        return False
    return "image_generator" in active_specialists(routing)


@dataclass
class TaskRouting:
    """Pre-run analysis of the user prompt."""

    primary_agent: AgentName
    selected_agents: list[AgentName]
    intent: str
    topics: list[str] = field(default_factory=list)
    reasoning: str = ""

    def to_task_prefix(self) -> str:
        """Internal hint for the selector (not shown in the chat UI)."""
        topics = ", ".join(self.topics) if self.topics else "general"
        agents = ", ".join(self.selected_agents) if self.selected_agents else "assistant"
        return (
            f"[Internal routing only — do not repeat to the user] "
            f"intent={self.intent}; topics={topics}; agents={agents}.\n"
        )
