"""photo studio workspaces

Revision ID: 011
Revises: 010
Create Date: 2026-06-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "photo_studio_workspaces",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("asset_id", UUID(as_uuid=True), sa.ForeignKey("rag_documents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("asset_name", sa.String(length=512), nullable=True),
        sa.Column("state", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_opened_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_photo_studio_workspaces_user_id", "photo_studio_workspaces", ["user_id"])
    op.create_index("ix_photo_studio_workspaces_last_opened_at", "photo_studio_workspaces", ["last_opened_at"])


def downgrade() -> None:
    op.drop_index("ix_photo_studio_workspaces_last_opened_at", table_name="photo_studio_workspaces")
    op.drop_index("ix_photo_studio_workspaces_user_id", table_name="photo_studio_workspaces")
    op.drop_table("photo_studio_workspaces")
