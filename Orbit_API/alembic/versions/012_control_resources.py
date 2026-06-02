"""control center resources (widgets, cards, personalization, themes)

Revision ID: 012
Revises: 011
Create Date: 2026-06-02
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "widgets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("icon_key", sa.String(64), nullable=False, server_default="Sparkles"),
    )
    op.create_index("ix_widgets_key", "widgets", ["key"])

    op.create_table(
        "agent_widgets",
        sa.Column(
            "agent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agents.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "widget_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("widgets.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    op.create_table(
        "adaptive_cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("payload", postgresql.JSONB(), nullable=False, server_default="{}"),
    )

    op.create_table(
        "agent_adaptive_cards",
        sa.Column(
            "agent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agents.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "card_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("adaptive_cards.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    op.create_table(
        "agent_personalizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "agent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agents.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("greeting", sa.Text(), nullable=False, server_default=""),
        sa.Column("avatar_emoji", sa.String(16), nullable=False, server_default="🤖"),
        sa.Column("quick_prompts", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("tone", sa.String(32), nullable=False, server_default="Friendly"),
        sa.Column("response_length", sa.String(32), nullable=False, server_default="Medium"),
        sa.Column("language", sa.String(32), nullable=False, server_default="English"),
    )

    op.create_table(
        "agent_themes",
        sa.Column(
            "agent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agents.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("border_radius", sa.String(32), nullable=False, server_default="0.625rem"),
        sa.Column("density", sa.String(32), nullable=False, server_default="comfortable"),
        sa.Column("font_sans", sa.String(64), nullable=False, server_default="Inter"),
        sa.Column("bubble_style", sa.String(32), nullable=False, server_default="rounded"),
        sa.Column("dark_mode", sa.String(32), nullable=False, server_default="follow system"),
    )


def downgrade() -> None:
    op.drop_table("agent_themes")
    op.drop_table("agent_personalizations")
    op.drop_table("agent_adaptive_cards")
    op.drop_table("adaptive_cards")
    op.drop_table("agent_widgets")
    op.drop_table("widgets")
