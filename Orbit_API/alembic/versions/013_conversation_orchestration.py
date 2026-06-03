"""conversation orchestration session fields

Revision ID: 013
Revises: 012
Create Date: 2026-06-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("orchestration_session_id", sa.String(64), nullable=True),
    )
    op.add_column(
        "conversations",
        sa.Column("orchestration_status", sa.String(32), nullable=True),
    )
    op.create_index(
        "ix_conversations_orchestration_session_id",
        "conversations",
        ["orchestration_session_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_conversations_orchestration_session_id", table_name="conversations")
    op.drop_column("conversations", "orchestration_status")
    op.drop_column("conversations", "orchestration_session_id")
