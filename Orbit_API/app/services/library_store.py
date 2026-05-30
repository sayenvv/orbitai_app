from __future__ import annotations

import uuid

from sqlalchemy.orm import Session, joinedload

from app.models import Agent, LibraryGeneratedFile


def _serialize_generated(row: LibraryGeneratedFile) -> dict:
    agent: Agent | None = row.agent
    source_doc = row.source_document
    return {
        "id": row.id,
        "title": row.title,
        "type": row.item_type,
        "preview": row.preview,
        "conversation_id": row.conversation_id,
        "agent_id": row.agent_id,
        "source_document_id": row.source_document_id,
        "source_filename": source_doc.original_filename if source_doc else None,
        "agent_slug": agent.slug if agent else None,
        "agent_name": agent.name if agent else "Clovai",
        "agent_short_name": agent.short_name if agent else None,
        "icon_key": agent.icon_key if agent else "Sparkles",
        "color_key": agent.color_key if agent else "indigo",
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def list_user_generated_files(db: Session, user_id: uuid.UUID) -> list[dict]:
    rows = (
        db.query(LibraryGeneratedFile)
        .options(
            joinedload(LibraryGeneratedFile.agent),
            joinedload(LibraryGeneratedFile.source_document),
        )
        .filter(LibraryGeneratedFile.user_id == user_id)
        .order_by(LibraryGeneratedFile.created_at.desc())
        .all()
    )
    return [_serialize_generated(row) for row in rows]


def get_user_generated_file(
    db: Session,
    user_id: uuid.UUID,
    file_id: uuid.UUID,
) -> LibraryGeneratedFile | None:
    return (
        db.query(LibraryGeneratedFile)
        .options(
            joinedload(LibraryGeneratedFile.agent),
            joinedload(LibraryGeneratedFile.source_document),
        )
        .filter(LibraryGeneratedFile.id == file_id, LibraryGeneratedFile.user_id == user_id)
        .first()
    )


def delete_user_generated_file(db: Session, row: LibraryGeneratedFile) -> None:
    db.delete(row)
    db.commit()


def list_user_library(db: Session, user_id: uuid.UUID) -> dict:
    from app.services.rag.document_store import list_user_documents

    return {
        "uploads": list_user_documents(db, user_id),
        "generated": list_user_generated_files(db, user_id),
    }
