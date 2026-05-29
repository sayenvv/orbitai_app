"""Seed Orbit API database from control center JSON."""

from __future__ import annotations

import json
import uuid
from pathlib import Path

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal, engine
from app.models import Agent, AgentConfiguration, AgentTool, Tool, User
from app.db.base import Base


def load_json(name: str) -> dict:
    base = Path(__file__).resolve().parent.parent / settings.control_center_data_dir
    path = base / name
    if not path.exists():
        raise FileNotFoundError(f"Missing seed file: {path}")
    return json.loads(path.read_text())


def parse_seed_uuid(value: str) -> uuid.UUID:
    # Control center tool IDs use a leading "t" (not valid hex); normalize for Postgres UUID columns.
    if value.startswith("t"):
        value = "a" + value[1:]
    return uuid.UUID(value)


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        agents_data = load_json("agents.json")["agents"]
        tools_data = load_json("tools.json")["tools"]
        configs_data = load_json("configurations.json")["configurations"]
        mappings_data = load_json("agent-tools.json")["mappings"]

        for t in tools_data:
            tool_id = parse_seed_uuid(t["id"])
            tool = db.query(Tool).filter(Tool.id == tool_id).first()
            if not tool:
                tool = Tool(
                    id=tool_id,
                    name=t["name"],
                    description=t.get("description", ""),
                    parameters=t.get("parameters", {}),
                    enabled=t.get("enabled", True),
                )
                db.add(tool)

        config_by_agent = {c["agentId"]: c for c in configs_data}
        tools_by_agent = {m["agentId"]: m["toolIds"] for m in mappings_data}

        for a in agents_data:
            agent_id = uuid.UUID(a["id"])
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            if not agent:
                agent = Agent(
                    id=agent_id,
                    slug=a["slug"],
                    name=a["name"],
                    short_name=a["shortName"],
                    description=a.get("description", ""),
                    status=a.get("status", "draft"),
                    icon_key=a.get("iconKey", "Sparkles"),
                    color_key=a.get("colorKey", "indigo"),
                )
                db.add(agent)

            cfg = config_by_agent.get(a["id"])
            if cfg:
                existing_cfg = (
                    db.query(AgentConfiguration)
                    .filter(AgentConfiguration.agent_id == agent_id)
                    .first()
                )
                if not existing_cfg:
                    db.add(
                        AgentConfiguration(
                            id=uuid.UUID(cfg["id"]),
                            agent_id=agent_id,
                            model=cfg.get("model", "gpt-4o-mini"),
                            temperature=cfg.get("temperature", 0.5),
                            max_tokens=cfg.get("maxTokens", 2048),
                            system_prompt=cfg.get("systemPrompt", ""),
                        )
                    )

            for tool_id_str in tools_by_agent.get(a["id"], []):
                tool_id = parse_seed_uuid(tool_id_str)
                link = (
                    db.query(AgentTool)
                    .filter(AgentTool.agent_id == agent_id, AgentTool.tool_id == tool_id)
                    .first()
                )
                if not link:
                    db.add(AgentTool(agent_id=agent_id, tool_id=tool_id))

        if not db.query(User).filter(User.email == "demo@orbit.ai").first():
            db.add(
                User(
                    email="demo@orbit.ai",
                    name="Demo User",
                    password_hash=hash_password("demo1234"),
                    role="user",
                )
            )

        if not db.query(User).filter(User.email == "operator@orbit.ai").first():
            db.add(
                User(
                    email="operator@orbit.ai",
                    name="Control Operator",
                    password_hash=hash_password("operator1234"),
                    role="operator",
                )
            )

        db.commit()
        active = db.query(Agent).filter(Agent.status == "active").count()
        print(f"Seed complete. Agents: {len(agents_data)}, active: {active}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
