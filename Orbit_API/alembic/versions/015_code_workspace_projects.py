"""code workspace projects

Revision ID: 015
Revises: 014
Create Date: 2026-06-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "code_workspace_projects",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("state", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_opened_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_code_workspace_projects_user_id", "code_workspace_projects", ["user_id"])
    op.create_index(
        "ix_code_workspace_projects_last_opened_at",
        "code_workspace_projects",
        ["last_opened_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_code_workspace_projects_last_opened_at", table_name="code_workspace_projects")
    op.drop_index("ix_code_workspace_projects_user_id", table_name="code_workspace_projects")
    op.drop_table("code_workspace_projects")
