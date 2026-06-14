"""AI coding platform persistence models."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlatformAgentConfig(Base):
    __tablename__ = "platform_agent_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    role_key: Mapped[str] = mapped_column(String(64), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    system_prompt: Mapped[str] = mapped_column(Text, default="")
    model_provider: Mapped[str] = mapped_column(String(32), default="openai")
    model_name: Mapped[str] = mapped_column(String(128), default="gpt-4o-mini")
    temperature: Mapped[float] = mapped_column(default=0.2)
    max_tokens: Mapped[int] = mapped_column(default=4096)
    tools: Mapped[list] = mapped_column(JSONB, default=list)
    context_policy: Mapped[dict] = mapped_column(JSONB, default=dict)
    retry_policy: Mapped[dict] = mapped_column(JSONB, default=dict)
    allowed_file_access: Mapped[dict] = mapped_column(JSONB, default=dict)
    workflow_stage: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    enabled: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PlatformToolConfig(Base):
    __tablename__ = "platform_tool_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    tool_type: Mapped[str] = mapped_column(String(64), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    enabled: Mapped[bool] = mapped_column(default=True)
    permissions: Mapped[dict] = mapped_column(JSONB, default=dict)
    config_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PlatformWorkflowConfig(Base):
    __tablename__ = "platform_workflow_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    intent: Mapped[str] = mapped_column(String(64), index=True)
    stages_json: Mapped[list] = mapped_column(JSONB, default=list)
    enabled: Mapped[bool] = mapped_column(default=True)
    require_human_approval: Mapped[bool] = mapped_column(default=False)
    max_fix_attempts: Mapped[int] = mapped_column(default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PlatformWorkflowRun(Base):
    __tablename__ = "platform_workflow_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("code_workspace_projects.id", ondelete="SET NULL"), nullable=True
    )
    workflow_config_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("platform_workflow_configs.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    current_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    input_prompt: Mapped[str] = mapped_column(Text, default="")
    intent: Mapped[str | None] = mapped_column(String(64), nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    artifact_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    workspace_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_input: Mapped[int] = mapped_column(default=0)
    token_output: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    agent_runs: Mapped[list["PlatformAgentRun"]] = relationship(back_populates="workflow_run")
    checkpoints: Mapped[list["PlatformCheckpoint"]] = relationship(back_populates="workflow_run")
    execution_logs: Mapped[list["PlatformExecutionLog"]] = relationship(back_populates="workflow_run")
    artifacts: Mapped[list["PlatformArtifact"]] = relationship(back_populates="workflow_run")


class PlatformAgentRun(Base):
    __tablename__ = "platform_agent_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("platform_workflow_runs.id", ondelete="CASCADE"), index=True
    )
    agent_name: Mapped[str] = mapped_column(String(128))
    role_key: Mapped[str] = mapped_column(String(64))
    stage: Mapped[str] = mapped_column(String(64), index=True)
    input_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    output_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    token_input: Mapped[int] = mapped_column(default=0)
    token_output: Mapped[int] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(String(32), default="running")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    workflow_run: Mapped["PlatformWorkflowRun"] = relationship(back_populates="agent_runs")


class PlatformCheckpoint(Base):
    __tablename__ = "platform_checkpoints"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("platform_workflow_runs.id", ondelete="CASCADE"), index=True
    )
    stage: Mapped[str] = mapped_column(String(64), index=True)
    checkpoint_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    workspace_snapshot_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="saved")
    retry_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workflow_run: Mapped["PlatformWorkflowRun"] = relationship(back_populates="checkpoints")


class PlatformProjectFile(Base):
    __tablename__ = "platform_project_files"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("platform_workflow_runs.id", ondelete="CASCADE"), index=True
    )
    file_path: Mapped[str] = mapped_column(String(1024), index=True)
    content: Mapped[str] = mapped_column(Text, default="")
    checksum: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PlatformExecutionLog(Base):
    __tablename__ = "platform_execution_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("platform_workflow_runs.id", ondelete="CASCADE"), index=True
    )
    stage: Mapped[str] = mapped_column(String(64), index=True)
    log_type: Mapped[str] = mapped_column(String(32), default="info")
    message: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workflow_run: Mapped["PlatformWorkflowRun"] = relationship(back_populates="execution_logs")


class PlatformArtifact(Base):
    __tablename__ = "platform_artifacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("platform_workflow_runs.id", ondelete="CASCADE"), index=True
    )
    artifact_type: Mapped[str] = mapped_column(String(32), default="zip")
    file_name: Mapped[str] = mapped_column(String(512))
    blob_url: Mapped[str] = mapped_column(String(2048))
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workflow_run: Mapped["PlatformWorkflowRun"] = relationship(back_populates="artifacts")
