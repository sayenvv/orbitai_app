from __future__ import annotations

from dataclasses import dataclass, field

from orbit_orchestration.domain.types import AgentName

VALID_AGENTS: frozenset[AgentName] = frozenset({"summarizer", "image_generator", "human"})


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
        agents = ", ".join(self.selected_agents)
        return (
            f"[Orchestrator routing] Intent: {self.intent}. "
            f"Topics: {topics}. Primary agent: {self.primary_agent}. "
            f"Active specialists: {agents}.\n"
        )
