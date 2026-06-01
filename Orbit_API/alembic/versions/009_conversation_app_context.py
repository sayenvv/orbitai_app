"""conversation app context

Revision ID: 009
Revises: 008
Create Date: 2026-06-01
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("app_slug", sa.String(length=128), nullable=True))
    op.add_column(
        "conversations",
        sa.Column(
            "source_id",
            UUID(as_uuid=True),
            sa.ForeignKey("rag_documents.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_conversations_app_slug", "conversations", ["app_slug"])
    op.create_index("ix_conversations_source_id", "conversations", ["source_id"])


def downgrade() -> None:
    op.drop_index("ix_conversations_source_id", table_name="conversations")
    op.drop_index("ix_conversations_app_slug", table_name="conversations")
    op.drop_column("conversations", "source_id")
    op.drop_column("conversations", "app_slug")
