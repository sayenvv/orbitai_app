"""Admin CRUD for AI platform agent, tool, and workflow configuration."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.control._helpers import require_operator
from app.db.session import get_db
from app.models import User
from app.models.ai_platform import PlatformAgentConfig, PlatformToolConfig, PlatformWorkflowConfig
from app.schemas.ai_platform import (
    PlatformAgentConfigResponse,
    PlatformAgentConfigUpsert,
    PlatformToolConfigResponse,
    PlatformWorkflowConfigResponse,
    PlatformWorkflowConfigUpsert,
)
from app.services.ai_platform.stores.config_store import ensure_default_platform_configs

router = APIRouter(prefix="/control/platform", tags=["control-platform"])


@router.get("/agents", response_model=list[PlatformAgentConfigResponse])
def list_platform_agents(
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    ensure_default_platform_configs(db)
    return db.query(PlatformAgentConfig).order_by(PlatformAgentConfig.role_key).all()


@router.post("/agents", response_model=PlatformAgentConfigResponse, status_code=201)
def create_platform_agent(
    body: PlatformAgentConfigUpsert,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    if db.query(PlatformAgentConfig).filter(PlatformAgentConfig.name == body.name).first():
        raise HTTPException(status_code=400, detail="Agent name already exists.")
    row = PlatformAgentConfig(id=uuid.uuid4(), **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/agents/{agent_id}", response_model=PlatformAgentConfigResponse)
def update_platform_agent(
    agent_id: uuid.UUID,
    body: PlatformAgentConfigUpsert,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    row = db.query(PlatformAgentConfig).filter(PlatformAgentConfig.id == agent_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Agent config not found.")
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/tools", response_model=list[PlatformToolConfigResponse])
def list_platform_tools(
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    ensure_default_platform_configs(db)
    return db.query(PlatformToolConfig).order_by(PlatformToolConfig.name).all()


@router.get("/workflows", response_model=list[PlatformWorkflowConfigResponse])
def list_platform_workflows(
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    ensure_default_platform_configs(db)
    return db.query(PlatformWorkflowConfig).order_by(PlatformWorkflowConfig.intent).all()


@router.post("/workflows", response_model=PlatformWorkflowConfigResponse, status_code=201)
def create_platform_workflow(
    body: PlatformWorkflowConfigUpsert,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    if db.query(PlatformWorkflowConfig).filter(PlatformWorkflowConfig.name == body.name).first():
        raise HTTPException(status_code=400, detail="Workflow name already exists.")
    row = PlatformWorkflowConfig(id=uuid.uuid4(), **body.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/workflows/{workflow_id}", response_model=PlatformWorkflowConfigResponse)
def update_platform_workflow(
    workflow_id: uuid.UUID,
    body: PlatformWorkflowConfigUpsert,
    db: Session = Depends(get_db),
    _: User = Depends(require_operator),
):
    row = db.query(PlatformWorkflowConfig).filter(PlatformWorkflowConfig.id == workflow_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Workflow config not found.")
    for key, value in body.model_dump().items():
        setattr(row, key, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
