"""AI platform tables.

Revision ID: 018
Revises: 017
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "platform_agent_configs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False, unique=True),
        sa.Column("role_key", sa.String(64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("system_prompt", sa.Text(), nullable=False, server_default=""),
        sa.Column("model_provider", sa.String(32), nullable=False, server_default="openai"),
        sa.Column("model_name", sa.String(128), nullable=False, server_default="gpt-4o-mini"),
        sa.Column("temperature", sa.Float(), nullable=False, server_default="0.2"),
        sa.Column("max_tokens", sa.Integer(), nullable=False, server_default="4096"),
        sa.Column("tools", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("context_policy", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("retry_policy", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column(
            "allowed_file_access", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")
        ),
        sa.Column("workflow_stage", sa.String(64), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_platform_agent_configs_role_key", "platform_agent_configs", ["role_key"])
    op.create_index(
        "ix_platform_agent_configs_workflow_stage", "platform_agent_configs", ["workflow_stage"]
    )

    op.create_table(
        "platform_tool_configs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False, unique=True),
        sa.Column("tool_type", sa.String(64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("permissions", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("config_json", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_platform_tool_configs_tool_type", "platform_tool_configs", ["tool_type"])

    op.create_table(
        "platform_workflow_configs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False, unique=True),
        sa.Column("intent", sa.String(64), nullable=False),
        sa.Column("stages_json", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "require_human_approval", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("max_fix_attempts", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_platform_workflow_configs_intent", "platform_workflow_configs", ["intent"])

    op.create_table(
        "platform_workflow_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column(
            "project_id",
            UUID(as_uuid=True),
            sa.ForeignKey("code_workspace_projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "workflow_config_id",
            UUID(as_uuid=True),
            sa.ForeignKey("platform_workflow_configs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("current_stage", sa.String(64), nullable=True),
        sa.Column("input_prompt", sa.Text(), nullable=False, server_default=""),
        sa.Column("intent", sa.String(64), nullable=True),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("artifact_url", sa.String(2048), nullable=True),
        sa.Column("workspace_path", sa.Text(), nullable=True),
        sa.Column("token_input", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("token_output", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_platform_workflow_runs_user_id", "platform_workflow_runs", ["user_id"])
    op.create_index("ix_platform_workflow_runs_status", "platform_workflow_runs", ["status"])

    op.create_table(
        "platform_agent_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workflow_run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("platform_workflow_runs.id", ondelete="CASCADE"),
        ),
        sa.Column("agent_name", sa.String(128), nullable=False),
        sa.Column("role_key", sa.String(64), nullable=False),
        sa.Column("stage", sa.String(64), nullable=False),
        sa.Column("input_json", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("output_json", JSONB, nullable=True),
        sa.Column("token_input", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("token_output", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(32), nullable=False, server_default="running"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_platform_agent_runs_workflow_run_id", "platform_agent_runs", ["workflow_run_id"]
    )

    op.create_table(
        "platform_checkpoints",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workflow_run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("platform_workflow_runs.id", ondelete="CASCADE"),
        ),
        sa.Column("stage", sa.String(64), nullable=False),
        sa.Column("checkpoint_data", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("workspace_snapshot_path", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="saved"),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "platform_project_files",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workflow_run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("platform_workflow_runs.id", ondelete="CASCADE"),
        ),
        sa.Column("file_path", sa.String(1024), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("checksum", sa.String(64), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "platform_execution_logs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workflow_run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("platform_workflow_runs.id", ondelete="CASCADE"),
        ),
        sa.Column("stage", sa.String(64), nullable=False),
        sa.Column("log_type", sa.String(32), nullable=False, server_default="info"),
        sa.Column("message", sa.Text(), nullable=False, server_default=""),
        sa.Column("payload", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "platform_artifacts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workflow_run_id",
            UUID(as_uuid=True),
            sa.ForeignKey("platform_workflow_runs.id", ondelete="CASCADE"),
        ),
        sa.Column("artifact_type", sa.String(32), nullable=False, server_default="zip"),
        sa.Column("file_name", sa.String(512), nullable=False),
        sa.Column("blob_url", sa.String(2048), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("platform_artifacts")
    op.drop_table("platform_execution_logs")
    op.drop_table("platform_project_files")
    op.drop_table("platform_checkpoints")
    op.drop_table("platform_agent_runs")
    op.drop_table("platform_workflow_runs")
    op.drop_table("platform_workflow_configs")
    op.drop_table("platform_tool_configs")
    op.drop_table("platform_agent_configs")
