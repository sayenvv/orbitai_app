"""photo studio generations

Revision ID: 010
Revises: 009
Create Date: 2026-06-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "photo_studio_generations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("batch_id", sa.String(length=64), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("creation_type", sa.String(length=32), nullable=False),
        sa.Column("aspect_ratio", sa.String(length=16), nullable=False),
        sa.Column("style_preset", sa.String(length=32), nullable=False),
        sa.Column("label", sa.String(length=128), nullable=False),
        sa.Column("preview_gradient", sa.String(length=255), nullable=False),
        sa.Column("transparent_background", sa.Boolean(), nullable=True),
        sa.Column("canvas_background_id", sa.String(length=64), nullable=True),
        sa.Column("variant_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "reference_asset_id",
            UUID(as_uuid=True),
            sa.ForeignKey("rag_documents.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("image_url", sa.String(length=1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_photo_studio_generations_user_id",
        "photo_studio_generations",
        ["user_id"],
    )
    op.create_index(
        "ix_photo_studio_generations_batch_id",
        "photo_studio_generations",
        ["batch_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_photo_studio_generations_batch_id", table_name="photo_studio_generations")
    op.drop_index("ix_photo_studio_generations_user_id", table_name="photo_studio_generations")
    op.drop_table("photo_studio_generations")
