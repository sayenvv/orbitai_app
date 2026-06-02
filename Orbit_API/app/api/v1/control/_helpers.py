import uuid
from uuid import UUID

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.public.auth import require_control_user
from app.db.session import get_db
from app.models import Agent, User


def require_operator(user: User = Depends(require_control_user)) -> User:
    if user.role not in ("operator", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Operator access required")
    return user


def normalize_control_uuid(value: str) -> uuid.UUID:
    """Normalize control-center seed IDs (t/w/p/ac prefixes) to valid UUIDs."""
    if value.startswith("ac"):
        value = "aa" + value[2:]
    elif value.startswith(("t", "w", "p")):
        value = "a" + value[1:]
    return uuid.UUID(value)


def resolve_agent(db: Session, agent_id: str) -> Agent | None:
    try:
        uid = UUID(agent_id)
        agent = db.query(Agent).filter(Agent.id == uid).first()
        if agent:
            return agent
    except ValueError:
        pass
    return db.query(Agent).filter(Agent.slug == agent_id).first()


def require_agent(db: Session, agent_id: str) -> Agent:
    agent = resolve_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent
