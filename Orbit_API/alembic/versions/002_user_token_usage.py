"""user token usage

Revision ID: 002
Revises: 001
Create Date: 2026-05-28
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("plan", sa.String(32), nullable=False, server_default="free"),
    )
    op.add_column(
        "users",
        sa.Column("tokens_used", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "users",
        sa.Column("tokens_period_start", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "tokens_period_start")
    op.drop_column("users", "tokens_used")
    op.drop_column("users", "plan")
