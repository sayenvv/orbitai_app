import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session, joinedload

from app.models import Agent, AgentConfiguration, AgentTool, Tool

CLOVAI_AGENT_SLUG = "clovai"
DEFAULT_AGENT_SLUG = "study-helper"


@dataclass
class AgentRuntimeConfig:
    agent_id: uuid.UUID
    slug: str
    name: str
    model: str
    temperature: float
    max_tokens: int
    system_prompt: str
    tool_names: list[str]


class AgentRegistry:
    def __init__(self, db: Session):
        self.db = db

    def get_by_slug(self, slug: str) -> AgentRuntimeConfig | None:
        agent = (
            self.db.query(Agent)
            .options(
                joinedload(Agent.configuration),
                joinedload(Agent.agent_tools).joinedload(AgentTool.tool),
            )
            .filter(Agent.slug == slug, Agent.status == "active")
            .first()
        )
        if not agent or not agent.configuration:
            return None
        return self._to_runtime(agent)

    def get_clovai(self) -> AgentRuntimeConfig | None:
        """Platform default chat assistant — configured in Control Center, not shown in public catalog."""
        agent = (
            self.db.query(Agent)
            .options(
                joinedload(Agent.configuration),
                joinedload(Agent.agent_tools).joinedload(AgentTool.tool),
            )
            .filter(Agent.slug == CLOVAI_AGENT_SLUG)
            .first()
        )
        if not agent or not agent.configuration:
            return None
        return self._to_runtime(agent)

    def get_default(self) -> AgentRuntimeConfig | None:
        """Default agent for non-chat flows (e.g. library insight generation)."""
        preferred = self.get_by_slug(DEFAULT_AGENT_SLUG)
        if preferred:
            return preferred

        agent = (
            self.db.query(Agent)
            .options(
                joinedload(Agent.configuration),
                joinedload(Agent.agent_tools).joinedload(AgentTool.tool),
            )
            .filter(Agent.status == "active")
            .order_by(Agent.slug)
            .first()
        )
        if not agent or not agent.configuration:
            return None
        return self._to_runtime(agent)

    def list_active_public(self) -> list[Agent]:
        return (
            self.db.query(Agent)
            .filter(Agent.status == "active", Agent.slug != CLOVAI_AGENT_SLUG)
            .order_by(Agent.name)
            .all()
        )

    @staticmethod
    def _to_runtime(agent: Agent) -> AgentRuntimeConfig:
        cfg: AgentConfiguration = agent.configuration
        tool_names = [
            at.tool.name for at in agent.agent_tools if at.tool and at.tool.enabled
        ]
        return AgentRuntimeConfig(
            agent_id=agent.id,
            slug=agent.slug,
            name=agent.name,
            model=cfg.model,
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
            system_prompt=cfg.system_prompt,
            tool_names=tool_names,
        )
