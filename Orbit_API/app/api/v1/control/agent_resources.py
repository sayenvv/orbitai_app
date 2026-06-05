import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.control._helpers import normalize_control_uuid, require_agent, require_operator
from app.db.session import get_db
from app.services.agent_registry import invalidate_agent_registry_cache
from app.models import (
    AdaptiveCard,
    Agent,
    AgentAdaptiveCard,
    AgentPersonalization,
    AgentTheme,
    AgentTool,
    AgentWidget,
    Tool,
    User,
    Widget,
)
from app.schemas import (
    ControlAdaptiveCardItem,
    ControlAgentWidgetsResponse,
    ControlAgentWidgetsUpdate,
    ControlPersonalizationResponse,
    ControlPersonalizationUpdate,
    ControlThemeResponse,
    ControlThemeUpdate,
    ControlToolItem,
    ControlWidgetItem,
)

router = APIRouter(prefix="/control", tags=["control"])


def _tool_to_item(tool: Tool) -> ControlToolItem:
    return ControlToolItem(
        id=tool.id,
        name=tool.name,
        description=tool.description,
        parameters=tool.parameters or {},
        enabled=tool.enabled,
    )


def _upsert_tool(db: Session, item: ControlToolItem) -> Tool:
    tool: Tool | None = None
    if item.id is not None:
        try:
            tool_id = normalize_control_uuid(str(item.id))
            tool = db.get(Tool, tool_id)
        except ValueError:
            tool_id = uuid.uuid4()
            tool = None
        if tool is None:
            tool = Tool(id=tool_id)
            db.add(tool)
    else:
        tool = db.query(Tool).filter(Tool.name == item.name).first()
        if tool is None:
            tool = Tool(id=uuid.uuid4())
            db.add(tool)

    tool.name = item.name
    tool.description = item.description
    tool.parameters = item.parameters
    tool.enabled = item.enabled
    db.flush()
    return tool


def _upsert_adaptive_card(db: Session, item: ControlAdaptiveCardItem) -> AdaptiveCard:
    card: AdaptiveCard | None = None
    if item.id is not None:
        try:
            card_id = normalize_control_uuid(str(item.id))
            card = db.get(AdaptiveCard, card_id)
        except ValueError:
            card_id = uuid.uuid4()
            card = None
        if card is None:
            card = AdaptiveCard(id=card_id)
            db.add(card)
    else:
        card = db.query(AdaptiveCard).filter(AdaptiveCard.name == item.name).first()
        if card is None:
            card = AdaptiveCard(id=uuid.uuid4())
            db.add(card)

    card.name = item.name
    card.description = item.description
    card.payload = item.payload
    db.flush()
    return card


def _default_personalization(agent: Agent) -> ControlPersonalizationResponse:
    return ControlPersonalizationResponse(
        id=uuid.uuid4(),
        agent_id=agent.id,
        greeting=f"Hi! I'm {agent.name}. How can I help?",
        avatar_emoji="🤖",
        quick_prompts=["How can I help?"],
        tone="Friendly",
        response_length="Medium",
        language="English",
    )


def _get_or_create_theme(db: Session, agent: Agent) -> AgentTheme:
    theme = db.query(AgentTheme).filter(AgentTheme.agent_id == agent.id).first()
    if theme:
        return theme
    theme = AgentTheme(agent_id=agent.id)
    db.add(theme)
    db.flush()
    return theme


@router.get("/agents/{agent_id}/tools", response_model=list[ControlToolItem])
def get_agent_tools(
    agent_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = require_agent(db, agent_id)
    tools = (
        db.query(Tool)
        .join(AgentTool, AgentTool.tool_id == Tool.id)
        .filter(AgentTool.agent_id == agent.id)
        .order_by(Tool.name)
        .all()
    )
    return [_tool_to_item(tool) for tool in tools]


@router.put("/agents/{agent_id}/tools", response_model=list[ControlToolItem])
def replace_agent_tools(
    agent_id: str,
    body: list[ControlToolItem],
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = require_agent(db, agent_id)
    db.query(AgentTool).filter(AgentTool.agent_id == agent.id).delete()

    saved: list[Tool] = []
    for item in body:
        tool = _upsert_tool(db, item)
        db.add(AgentTool(agent_id=agent.id, tool_id=tool.id))
        saved.append(tool)

    db.commit()
    invalidate_agent_registry_cache()
    return [_tool_to_item(tool) for tool in saved]


@router.get("/agents/{agent_id}/widgets", response_model=ControlAgentWidgetsResponse)
def get_agent_widgets(
    agent_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = require_agent(db, agent_id)
    widgets = db.query(Widget).order_by(Widget.name).all()
    enabled_ids = [
        row.widget_id
        for row in db.query(AgentWidget).filter(AgentWidget.agent_id == agent.id).all()
    ]
    return ControlAgentWidgetsResponse(
        widgets=[ControlWidgetItem.model_validate(w) for w in widgets],
        enabled_widget_ids=enabled_ids,
    )


@router.put("/agents/{agent_id}/widgets", response_model=ControlAgentWidgetsResponse)
def replace_agent_widgets(
    agent_id: str,
    body: ControlAgentWidgetsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = require_agent(db, agent_id)
    db.query(AgentWidget).filter(AgentWidget.agent_id == agent.id).delete()

    valid_ids = {w.id for w in db.query(Widget).all()}
    for widget_id in body.enabled_widget_ids:
        if widget_id in valid_ids:
            db.add(AgentWidget(agent_id=agent.id, widget_id=widget_id))

    db.commit()

    widgets = db.query(Widget).order_by(Widget.name).all()
    enabled_ids = [
        row.widget_id
        for row in db.query(AgentWidget).filter(AgentWidget.agent_id == agent.id).all()
    ]
    return ControlAgentWidgetsResponse(
        widgets=[ControlWidgetItem.model_validate(w) for w in widgets],
        enabled_widget_ids=enabled_ids,
    )


@router.get("/agents/{agent_id}/adaptive-cards", response_model=list[ControlAdaptiveCardItem])
def get_agent_adaptive_cards(
    agent_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = require_agent(db, agent_id)
    cards = (
        db.query(AdaptiveCard)
        .join(AgentAdaptiveCard, AgentAdaptiveCard.card_id == AdaptiveCard.id)
        .filter(AgentAdaptiveCard.agent_id == agent.id)
        .order_by(AdaptiveCard.name)
        .all()
    )
    return [
        ControlAdaptiveCardItem(
            id=card.id,
            name=card.name,
            description=card.description,
            payload=card.payload or {},
        )
        for card in cards
    ]


@router.put("/agents/{agent_id}/adaptive-cards", response_model=list[ControlAdaptiveCardItem])
def replace_agent_adaptive_cards(
    agent_id: str,
    body: list[ControlAdaptiveCardItem],
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = require_agent(db, agent_id)
    db.query(AgentAdaptiveCard).filter(AgentAdaptiveCard.agent_id == agent.id).delete()

    saved: list[AdaptiveCard] = []
    for item in body:
        card = _upsert_adaptive_card(db, item)
        db.add(AgentAdaptiveCard(agent_id=agent.id, card_id=card.id))
        saved.append(card)

    db.commit()
    return [
        ControlAdaptiveCardItem(
            id=card.id,
            name=card.name,
            description=card.description,
            payload=card.payload or {},
        )
        for card in saved
    ]


@router.get("/agents/{agent_id}/personalization", response_model=ControlPersonalizationResponse)
def get_agent_personalization(
    agent_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = require_agent(db, agent_id)
    row = db.query(AgentPersonalization).filter(AgentPersonalization.agent_id == agent.id).first()
    if not row:
        return _default_personalization(agent)
    return ControlPersonalizationResponse(
        id=row.id,
        agent_id=row.agent_id,
        greeting=row.greeting,
        avatar_emoji=row.avatar_emoji,
        quick_prompts=list(row.quick_prompts or []),
        tone=row.tone,
        response_length=row.response_length,
        language=row.language,
    )


@router.put("/agents/{agent_id}/personalization", response_model=ControlPersonalizationResponse)
def upsert_agent_personalization(
    agent_id: str,
    body: ControlPersonalizationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = require_agent(db, agent_id)
    row = db.query(AgentPersonalization).filter(AgentPersonalization.agent_id == agent.id).first()
    if not row:
        row = AgentPersonalization(agent_id=agent.id)
        db.add(row)

    row.greeting = body.greeting
    row.avatar_emoji = body.avatar_emoji
    row.quick_prompts = body.quick_prompts
    row.tone = body.tone
    row.response_length = body.response_length
    row.language = body.language
    db.commit()
    db.refresh(row)
    return ControlPersonalizationResponse(
        id=row.id,
        agent_id=row.agent_id,
        greeting=row.greeting,
        avatar_emoji=row.avatar_emoji,
        quick_prompts=list(row.quick_prompts or []),
        tone=row.tone,
        response_length=row.response_length,
        language=row.language,
    )


@router.get("/agents/{agent_id}/theme", response_model=ControlThemeResponse)
def get_agent_theme(
    agent_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = require_agent(db, agent_id)
    theme = db.query(AgentTheme).filter(AgentTheme.agent_id == agent.id).first()
    if not theme:
        return ControlThemeResponse(
            color_key=agent.color_key,
            border_radius="0.625rem",
            density="comfortable",
            font_sans="Inter",
            bubble_style="rounded",
            dark_mode="follow system",
        )
    return ControlThemeResponse(
        color_key=agent.color_key,
        border_radius=theme.border_radius,
        density=theme.density,
        font_sans=theme.font_sans,
        bubble_style=theme.bubble_style,
        dark_mode=theme.dark_mode,
    )


@router.patch("/agents/{agent_id}/theme", response_model=ControlThemeResponse)
def update_agent_theme(
    agent_id: str,
    body: ControlThemeUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = require_agent(db, agent_id)
    theme = _get_or_create_theme(db, agent)

    if body.color_key is not None:
        agent.color_key = body.color_key
    if body.border_radius is not None:
        theme.border_radius = body.border_radius
    if body.density is not None:
        theme.density = body.density
    if body.font_sans is not None:
        theme.font_sans = body.font_sans
    if body.bubble_style is not None:
        theme.bubble_style = body.bubble_style
    if body.dark_mode is not None:
        theme.dark_mode = body.dark_mode

    db.commit()
    db.refresh(theme)
    db.refresh(agent)
    return ControlThemeResponse(
        color_key=agent.color_key,
        border_radius=theme.border_radius,
        density=theme.density,
        font_sans=theme.font_sans,
        bubble_style=theme.bubble_style,
        dark_mode=theme.dark_mode,
    )
