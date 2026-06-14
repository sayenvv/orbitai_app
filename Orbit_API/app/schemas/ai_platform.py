"""Pydantic schemas for the AI coding platform API."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PlatformGenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=8000)
    conversation_id: UUID | None = None


class PlatformAgentConfigResponse(BaseModel):
    id: UUID
    name: str
    role_key: str
    description: str
    system_prompt: str
    model_provider: str
    model_name: str
    temperature: float
    max_tokens: int
    tools: list[str]
    context_policy: dict[str, Any]
    retry_policy: dict[str, Any]
    allowed_file_access: dict[str, Any]
    workflow_stage: str | None
    enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PlatformAgentConfigUpsert(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    role_key: str = Field(min_length=1, max_length=64)
    description: str = ""
    system_prompt: str
    model_provider: str = "openai"
    model_name: str = "gpt-4o-mini"
    temperature: float = 0.2
    max_tokens: int = 4096
    tools: list[str] = Field(default_factory=list)
    context_policy: dict[str, Any] = Field(default_factory=dict)
    retry_policy: dict[str, Any] = Field(default_factory=lambda: {"max_retries": 2})
    allowed_file_access: dict[str, Any] = Field(default_factory=dict)
    workflow_stage: str | None = None
    enabled: bool = True


class PlatformToolConfigResponse(BaseModel):
    id: UUID
    name: str
    tool_type: str
    description: str
    enabled: bool
    permissions: dict[str, Any]
    config_json: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class PlatformWorkflowConfigResponse(BaseModel):
    id: UUID
    name: str
    intent: str
    stages_json: list[dict[str, Any]]
    enabled: bool
    require_human_approval: bool
    max_fix_attempts: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PlatformWorkflowConfigUpsert(BaseModel):
    name: str
    intent: str
    stages_json: list[dict[str, Any]]
    enabled: bool = True
    require_human_approval: bool = False
    max_fix_attempts: int = 3


class PlatformWorkflowRunResponse(BaseModel):
    id: UUID
    user_id: UUID
    status: str
    current_stage: str | None
    input_prompt: str
    intent: str | None
    result_summary: str | None
    artifact_url: str | None
    token_input: int
    token_output: int
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class PlatformExecutionLogResponse(BaseModel):
    id: UUID
    stage: str
    log_type: str
    message: str
    payload: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class PlatformPreviewStatusResponse(BaseModel):
    active: bool
    status: str | None = None
    preview_url: str | None = None
    preview_proxy_url: str | None = None
    port: int | None = None
    stack: str | None = None
    command: str | None = None
    exit_code: int | None = None
    log_tail: list[str] = Field(default_factory=list)


class PlatformOpenIdeResponse(BaseModel):
    project_id: UUID
    orbit_ide_url: str
    vscode_url: str
    workspace_path: str
    title: str
