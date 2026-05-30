"""plan ai stack (chat + embedding providers per plan)

Revision ID: 006
Revises: 005
Create Date: 2026-05-30
"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LOCAL_STACK = {
    "chat": {"provider": "ollama", "model": "llama3.2", "deployment": None},
    "embeddings": {
        "provider": "fastembed",
        "model": "BAAI/bge-small-en-v1.5",
        "deployment": None,
        "dimensions": 384,
    },
}

AZURE_STACK = {
    "chat": {"provider": "azure_openai", "model": "gpt-4o", "deployment": "gpt-4o"},
    "embeddings": {
        "provider": "azure_openai",
        "model": "text-embedding-3-small",
        "deployment": "text-embedding-3-small",
        "dimensions": 1536,
    },
}

PLAN_STACKS: dict[str, dict] = {
    "free": LOCAL_STACK,
    "starter": LOCAL_STACK,
    "pro": AZURE_STACK,
    "enterprise": AZURE_STACK,
}


def upgrade() -> None:
    op.add_column("plan_limits", sa.Column("ai_stack", JSONB(), nullable=True))

    bind = op.get_bind()
    for plan, stack in PLAN_STACKS.items():
        bind.execute(
            sa.text("UPDATE plan_limits SET ai_stack = CAST(:stack AS jsonb) WHERE plan = :plan"),
            {"plan": plan, "stack": json.dumps(stack)},
        )

    op.alter_column("plan_limits", "ai_stack", nullable=False)


def downgrade() -> None:
    op.drop_column("plan_limits", "ai_stack")
