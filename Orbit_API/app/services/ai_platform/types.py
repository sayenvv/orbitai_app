"""Shared types for the AI coding platform."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

WorkflowStatus = Literal[
    "pending",
    "running",
    "awaiting_approval",
    "completed",
    "failed",
    "cancelled",
]

StageName = Literal[
    "intent_classification",
    "requirements",
    "planning",
    "architecture",
    "task_breakdown",
    "code_generation",
    "write_files",
    "validation",
    "fix",
    "review",
    "documentation",
    "artifact",
    "upload",
]


class AgentConfigDTO(BaseModel):
    id: str | None = None
    name: str
    role_key: str
    description: str = ""
    system_prompt: str
    model_provider: str = "openai"
    model_name: str = "gpt-4o-mini"
    temperature: float = 0.2
    max_tokens: int = 4096
    tools: list[str] = Field(default_factory=list)
    context_policy: dict[str, Any] = Field(default_factory=dict)
    retry_policy: dict[str, Any] = Field(default_factory=dict)
    allowed_file_access: dict[str, Any] = Field(default_factory=dict)
    workflow_stage: str | None = None
    enabled: bool = True


class WorkflowStageConfig(BaseModel):
    stage: str
    role_key: str
    parallel_group: str | None = None
    requires_approval: bool = False


class WorkflowContext(BaseModel):
    workflow_run_id: str
    user_id: str
    prompt: str
    stage: str
    intent: str | None = None
    intent_metadata: dict[str, Any] = Field(default_factory=dict)
    requirements: dict[str, Any] = Field(default_factory=dict)
    plan: dict[str, Any] = Field(default_factory=dict)
    architecture: dict[str, Any] = Field(default_factory=dict)
    tasks: list[dict[str, Any]] = Field(default_factory=list)
    generated_files: list[dict[str, Any]] = Field(default_factory=list)
    validation: dict[str, Any] = Field(default_factory=dict)
    review: dict[str, Any] = Field(default_factory=dict)
    documentation: dict[str, Any] = Field(default_factory=dict)
    artifact: dict[str, Any] = Field(default_factory=dict)
    file_tree: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    retry_count: int = 0
    workspace_path: str = ""


class StreamEvent(BaseModel):
    type: str
    stage: str | None = None
    agent: str | None = None
    message: str = ""
    payload: dict[str, Any] = Field(default_factory=dict)

    def to_sse(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)
