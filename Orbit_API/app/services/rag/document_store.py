from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import RagDocument


def serialize_document(doc: RagDocument) -> dict:
    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "conversation_id": doc.conversation_id,
        "original_filename": doc.original_filename,
        "name": doc.original_filename,
        "original_name": doc.original_filename,
        "mime_type": doc.mime_type,
        "file_size_bytes": doc.file_size_bytes,
        "page_count": doc.page_count,
        "pages_processed": doc.pages_processed,
        "chunk_count": doc.chunk_count,
        "status": doc.status,
        "error_message": doc.error_message,
        "metadata": doc.doc_metadata or {},
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


def list_user_documents(db: Session, user_id: uuid.UUID) -> list[dict]:
    rows = (
        db.query(RagDocument)
        .filter(RagDocument.user_id == user_id)
        .order_by(RagDocument.created_at.desc())
        .all()
    )
    return [serialize_document(row) for row in rows]


def get_user_document(db: Session, user_id: uuid.UUID, document_id: uuid.UUID) -> RagDocument | None:
    return (
        db.query(RagDocument)
        .filter(RagDocument.id == document_id, RagDocument.user_id == user_id)
        .first()
    )


def delete_user_document(db: Session, document: RagDocument) -> None:
    from app.services.rag.ingest import delete_storage_file

    delete_storage_file(document.storage_path)
    db.delete(document)
    db.commit()
