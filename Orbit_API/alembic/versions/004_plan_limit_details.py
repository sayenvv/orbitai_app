"""plan limit details (label, tagline, features, highlight)

Revision ID: 004
Revises: 003
Create Date: 2026-05-28
"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PLAN_DEFAULTS: dict[str, dict] = {
    "free": {
        "label": "Free",
        "tagline": "Everything you need to explore Orbit",
        "features": [
            "Core AI assistants",
            "Standard response speed",
            "Community support",
        ],
        "highlight": False,
    },
    "starter": {
        "label": "Starter",
        "tagline": "Built for consistent daily use",
        "features": [
            "Everything in Free",
            "Higher monthly allowance",
            "Priority routing",
        ],
        "highlight": False,
    },
    "pro": {
        "label": "Pro",
        "tagline": "For power users who rely on AI daily",
        "features": [
            "Everything in Starter",
            "Maximum token allowance",
            "Early access to new agents",
        ],
        "highlight": True,
    },
    "enterprise": {
        "label": "Enterprise",
        "tagline": "Scale without limits across your team",
        "features": [
            "Unlimited tokens",
            "Dedicated account manager",
            "Custom integrations & SLA",
        ],
        "highlight": False,
    },
}


def upgrade() -> None:
    op.add_column("plan_limits", sa.Column("label", sa.String(64), nullable=True))
    op.add_column("plan_limits", sa.Column("tagline", sa.Text(), nullable=True))
    op.add_column(
        "plan_limits",
        sa.Column("features", JSONB(), nullable=False, server_default="[]"),
    )
    op.add_column(
        "plan_limits",
        sa.Column("highlight", sa.Boolean(), nullable=False, server_default="false"),
    )

    conn = op.get_bind()
    for plan, defaults in PLAN_DEFAULTS.items():
        conn.execute(
            sa.text(
                """
                UPDATE plan_limits
                SET label = :label,
                    tagline = :tagline,
                    features = CAST(:features AS jsonb),
                    highlight = :highlight
                WHERE plan = :plan
                """
            ),
            {
                "plan": plan,
                "label": defaults["label"],
                "tagline": defaults["tagline"],
                "features": json.dumps(defaults["features"]),
                "highlight": defaults["highlight"],
            },
        )

    op.alter_column("plan_limits", "label", nullable=False)


def downgrade() -> None:
    op.drop_column("plan_limits", "highlight")
    op.drop_column("plan_limits", "features")
    op.drop_column("plan_limits", "tagline")
    op.drop_column("plan_limits", "label")
