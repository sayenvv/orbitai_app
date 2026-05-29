from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.public.auth import require_user
from app.db.session import get_db
from app.models import Agent, AgentConfiguration, User
from app.schemas import (
    ControlAgentCreate,
    ControlAgentResponse,
    ControlAgentUpdate,
    ControlConfigurationResponse,
    ControlConfigurationUpdate,
)

router = APIRouter(prefix="/control", tags=["control"])


def require_operator(user: User = Depends(require_user)) -> User:
    if user.role not in ("operator", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Operator access required")
    return user


def _resolve_agent(db: Session, agent_id: str) -> Agent | None:
    try:
        uid = UUID(agent_id)
        agent = db.query(Agent).filter(Agent.id == uid).first()
        if agent:
            return agent
    except ValueError:
        pass
    return db.query(Agent).filter(Agent.slug == agent_id).first()


def _require_agent(db: Session, agent_id: str) -> Agent:
    agent = _resolve_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.get("/agents", response_model=list[ControlAgentResponse])
def list_agents(db: Session = Depends(get_db), _: User = Depends(require_operator)):
    return db.query(Agent).order_by(Agent.name).all()


@router.post("/agents", response_model=ControlAgentResponse, status_code=201)
def create_agent(
    body: ControlAgentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    if db.query(Agent).filter(Agent.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="Slug already exists")
    import uuid

    agent = Agent(
        id=uuid.uuid4(),
        slug=body.slug,
        name=body.name,
        short_name=body.short_name,
        description=body.description,
        status=body.status,
        icon_key=body.icon_key,
        color_key=body.color_key,
    )
    db.add(agent)
    db.add(
        AgentConfiguration(
            agent_id=agent.id,
            model="gpt-4o-mini",
            temperature=0.5,
            max_tokens=2048,
            system_prompt=f"You are {body.name}. Be helpful and concise.",
        )
    )
    db.commit()
    db.refresh(agent)
    return agent


@router.get("/agents/{agent_id}", response_model=ControlAgentResponse)
def get_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    return _require_agent(db, agent_id)


@router.patch("/agents/{agent_id}", response_model=ControlAgentResponse)
def update_agent(
    agent_id: str,
    body: ControlAgentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = _require_agent(db, agent_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)
    db.commit()
    db.refresh(agent)
    return agent


@router.post("/agents/{agent_id}/publish", response_model=ControlAgentResponse)
def publish_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = _require_agent(db, agent_id)
    agent.status = "active"
    db.commit()
    db.refresh(agent)
    return agent


@router.get("/agents/{agent_id}/configuration", response_model=ControlConfigurationResponse)
def get_configuration(
    agent_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = _require_agent(db, agent_id)
    cfg = db.query(AgentConfiguration).filter(AgentConfiguration.agent_id == agent.id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return ControlConfigurationResponse(
        model=cfg.model,
        temperature=cfg.temperature,
        max_tokens=cfg.max_tokens,
        system_prompt=cfg.system_prompt,
    )


@router.patch("/agents/{agent_id}/configuration", response_model=ControlConfigurationResponse)
def update_configuration(
    agent_id: str,
    body: ControlConfigurationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    agent = _require_agent(db, agent_id)
    cfg = db.query(AgentConfiguration).filter(AgentConfiguration.agent_id == agent.id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Configuration not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cfg, field, value)
    db.commit()
    db.refresh(cfg)
    return ControlConfigurationResponse(
        model=cfg.model,
        temperature=cfg.temperature,
        max_tokens=cfg.max_tokens,
        system_prompt=cfg.system_prompt,
    )
