"""Seed Orbit API database from control center JSON."""

from __future__ import annotations

import json
import uuid
from pathlib import Path

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal, engine
from app.models import (
    AdaptiveCard,
    Agent,
    AgentAdaptiveCard,
    AgentConfiguration,
    AgentPersonalization,
    AgentTool,
    AgentWidget,
    PlanLimit,
    Tool,
    User,
    Widget,
)
from app.db.base import Base


def load_json(name: str) -> dict:
    base = Path(__file__).resolve().parent.parent / settings.control_center_data_dir
    path = base / name
    if not path.exists():
        raise FileNotFoundError(f"Missing seed file: {path}")
    return json.loads(path.read_text())


def parse_seed_uuid(value: str) -> uuid.UUID:
    # Control center IDs use non-hex prefixes; normalize for Postgres UUID columns.
    if value.startswith("ac"):
        value = "aa" + value[2:]
    elif value.startswith(("t", "w", "p")):
        value = "a" + value[1:]
    return uuid.UUID(value)


def ensure_clovai_agent(db, agents_data: list, configs_data: list, mappings_data: list) -> None:
    """Upsert the platform default Clovai agent so existing databases pick it up on re-seed."""
    clovai = next((a for a in agents_data if a.get("slug") == "clovai"), None)
    if not clovai:
        return

    agent_id = uuid.UUID(clovai["id"])
    agent = db.get(Agent, agent_id)
    if not agent:
        agent = db.query(Agent).filter(Agent.slug == "clovai").first()

    if not agent:
        agent = Agent(
            id=agent_id,
            slug=clovai["slug"],
            name=clovai["name"],
            short_name=clovai["shortName"],
            description=clovai.get("description", ""),
            status=clovai.get("status", "active"),
            icon_key=clovai.get("iconKey", "Sparkles"),
            color_key=clovai.get("colorKey", "indigo"),
        )
        db.add(agent)
    else:
        agent.name = clovai["name"]
        agent.short_name = clovai["shortName"]
        agent.description = clovai.get("description", "")
        agent.status = clovai.get("status", "active")
        agent.icon_key = clovai.get("iconKey", "Sparkles")
        agent.color_key = clovai.get("colorKey", "indigo")

    cfg = next((c for c in configs_data if c.get("agentId") == clovai["id"]), None)
    if cfg:
        existing_cfg = (
            db.query(AgentConfiguration).filter(AgentConfiguration.agent_id == agent.id).first()
        )
        if not existing_cfg:
            db.add(
                AgentConfiguration(
                    id=uuid.UUID(cfg["id"]),
                    agent_id=agent.id,
                    model=cfg.get("model", "gpt-4o-mini"),
                    temperature=cfg.get("temperature", 0.5),
                    max_tokens=cfg.get("maxTokens", 2048),
                    system_prompt=cfg.get("systemPrompt", ""),
                )
            )

    tools_by_agent = {m["agentId"]: m["toolIds"] for m in mappings_data}
    for tool_id_str in tools_by_agent.get(clovai["id"], []):
        tool_id = parse_seed_uuid(tool_id_str)
        link = (
            db.query(AgentTool)
            .filter(AgentTool.agent_id == agent.id, AgentTool.tool_id == tool_id)
            .first()
        )
        if not link:
            db.add(AgentTool(agent_id=agent.id, tool_id=tool_id))


def seed_agent_resources(
    db,
    widgets_data: list,
    widget_mappings: list,
    cards_data: list,
    card_mappings: list,
    personalizations_data: list,
) -> None:
    for w in widgets_data:
        widget_id = parse_seed_uuid(w["id"])
        widget = db.query(Widget).filter(Widget.id == widget_id).first()
        if not widget:
            widget = Widget(
                id=widget_id,
                key=w["key"],
                name=w["name"],
                description=w.get("description", ""),
                icon_key=w.get("iconKey", "Sparkles"),
            )
            db.add(widget)

    widgets_by_agent = {m["agentId"]: m["widgetIds"] for m in widget_mappings}
    for agent_id_str, widget_ids in widgets_by_agent.items():
        agent_id = parse_seed_uuid(agent_id_str)
        agent = db.get(Agent, agent_id)
        if not agent:
            continue
        for widget_id_str in widget_ids:
            widget_id = parse_seed_uuid(widget_id_str)
            link = (
                db.query(AgentWidget)
                .filter(AgentWidget.agent_id == agent.id, AgentWidget.widget_id == widget_id)
                .first()
            )
            if not link:
                db.add(AgentWidget(agent_id=agent.id, widget_id=widget_id))

    for c in cards_data:
        card_id = parse_seed_uuid(c["id"])
        card = db.query(AdaptiveCard).filter(AdaptiveCard.id == card_id).first()
        if not card:
            card = AdaptiveCard(
                id=card_id,
                name=c["name"],
                description=c.get("description", ""),
                payload=c.get("payload", {}),
            )
            db.add(card)

    cards_by_agent = {m["agentId"]: m["cardIds"] for m in card_mappings}
    for agent_id_str, card_ids in cards_by_agent.items():
        agent_id = parse_seed_uuid(agent_id_str)
        agent = db.get(Agent, agent_id)
        if not agent:
            continue
        for card_id_str in card_ids:
            card_id = parse_seed_uuid(card_id_str)
            link = (
                db.query(AgentAdaptiveCard)
                .filter(AgentAdaptiveCard.agent_id == agent.id, AgentAdaptiveCard.card_id == card_id)
                .first()
            )
            if not link:
                db.add(AgentAdaptiveCard(agent_id=agent.id, card_id=card_id))

    for p in personalizations_data:
        agent_id = parse_seed_uuid(p["agentId"])
        agent = db.get(Agent, agent_id)
        if not agent:
            continue
        existing = (
            db.query(AgentPersonalization)
            .filter(AgentPersonalization.agent_id == agent.id)
            .first()
        )
        if existing:
            continue
        db.add(
            AgentPersonalization(
                id=parse_seed_uuid(p["id"]),
                agent_id=agent.id,
                greeting=p.get("greeting", ""),
                avatar_emoji=p.get("avatarEmoji", "🤖"),
                quick_prompts=p.get("quickPrompts", []),
                tone=p.get("tone", "Friendly"),
                response_length=p.get("responseLength", "Medium"),
                language=p.get("language", "English"),
            )
        )


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        agents_data = load_json("agents.json")["agents"]
        tools_data = load_json("tools.json")["tools"]
        configs_data = load_json("configurations.json")["configurations"]
        mappings_data = load_json("agent-tools.json")["mappings"]
        widgets_data = load_json("widgets.json")["widgets"]
        widget_mappings = load_json("agent-widgets.json")["mappings"]
        cards_data = load_json("adaptive-cards.json")["cards"]
        card_mappings = load_json("agent-adaptive-cards.json")["mappings"]
        personalizations_data = load_json("personalization.json")["personalizations"]

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
            if a.get("slug") == "clovai":
                continue

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

        ensure_clovai_agent(db, agents_data, configs_data, mappings_data)
        seed_agent_resources(
            db,
            widgets_data,
            widget_mappings,
            cards_data,
            card_mappings,
            personalizations_data,
        )

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

        if not db.query(User).filter(User.email == "admin@orbit.ai").first():
            db.add(
                User(
                    email="admin@orbit.ai",
                    name="Platform Admin",
                    password_hash=hash_password("admin1234"),
                    role="admin",
                )
            )

        from app.core.config import settings as app_settings
        from app.core.plan_limits import PLANS
        from app.services.plan_ai_stack import PLAN_STACK_DEFAULTS, ai_stack_to_dict
        from app.services.plan_limit_store import PLAN_DEFAULTS

        token_defaults = {
            "free": app_settings.free_plan_token_limit,
            "starter": app_settings.starter_plan_token_limit,
            "pro": app_settings.pro_plan_token_limit,
            "enterprise": app_settings.enterprise_plan_token_limit,
        }
        for plan in PLANS:
            if not db.query(PlanLimit).filter(PlanLimit.plan == plan).first():
                meta = PLAN_DEFAULTS.get(plan, {})
                stack = PLAN_STACK_DEFAULTS.get(plan)
                db.add(
                    PlanLimit(
                        plan=plan,
                        label=meta.get("label", plan.title()),
                        tagline=meta.get("tagline", ""),
                        features=meta.get("features", []),
                        highlight=bool(meta.get("highlight", False)),
                        token_limit=token_defaults[plan],
                        ai_stack=ai_stack_to_dict(stack) if stack else {},
                    )
                )

        db.commit()
        active = db.query(Agent).filter(Agent.status == "active").count()
        print(f"Seed complete. Agents: {len(agents_data)}, active: {active}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
