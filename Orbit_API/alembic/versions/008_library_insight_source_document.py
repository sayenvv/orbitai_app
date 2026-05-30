"""library insight source document link

Revision ID: 008
Revises: 007
Create Date: 2026-05-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "library_generated_files",
        sa.Column(
            "source_document_id",
            UUID(as_uuid=True),
            sa.ForeignKey("rag_documents.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_library_generated_files_source_document_id",
        "library_generated_files",
        ["source_document_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_library_generated_files_source_document_id",
        table_name="library_generated_files",
    )
    op.drop_column("library_generated_files", "source_document_id")
