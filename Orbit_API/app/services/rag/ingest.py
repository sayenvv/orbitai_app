from __future__ import annotations

import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import RagChunk, RagDocument, User
from app.services.plan_ai_stack import ai_stack_to_dict, get_plan_ai_stack
from app.services.rag.chunking import chunk_pages
from app.services.rag.embeddings import embed_texts
from app.services.rag.limits import max_pages_for_plan
from app.services.rag.pdf_extract import extract_pdf_pages


def ensure_upload_dir() -> Path:
    path = Path(settings.rag_upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_upload_file(*, user_id: uuid.UUID, document_id: uuid.UUID, filename: str, data: bytes) -> Path:
    root = ensure_upload_dir()
    user_dir = root / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name
    target = user_dir / f"{document_id}_{safe_name}"
    target.write_bytes(data)
    return target


def delete_storage_file(storage_path: str) -> None:
    path = Path(storage_path)
    if path.is_file():
        path.unlink(missing_ok=True)


def ingest_document(
    db: Session,
    document: RagDocument,
    user: User,
    *,
    raise_on_error: bool = True,
) -> RagDocument:
    document.status = "processing"
    document.error_message = None
    db.commit()

    try:
        page_cap = max_pages_for_plan(user.plan)
        extracted = extract_pdf_pages(document.storage_path, page_cap)
        document.page_count = extracted.total_pages
        document.pages_processed = extracted.pages_processed

        page_pairs = [(page.page_number, page.text) for page in extracted.pages]
        chunks = chunk_pages(page_pairs)
        if not chunks:
            raise ValueError("No extractable text found in PDF (it may be scanned or empty).")

        texts = [chunk.content for chunk in chunks]
        ai_stack = get_plan_ai_stack(db, user.plan)
        vectors = embed_texts(texts, stack=ai_stack)
        if len(vectors) != len(chunks):
            raise ValueError("Embedding generation failed.")

        db.query(RagChunk).filter(RagChunk.document_id == document.id).delete()

        for index, (chunk, vector) in enumerate(zip(chunks, vectors, strict=True)):
            db.add(
                RagChunk(
                    document_id=document.id,
                    chunk_index=index,
                    content=chunk.content,
                    page_start=chunk.page_start,
                    page_end=chunk.page_end,
                    embedding=vector,
                )
            )

        document.chunk_count = len(chunks)
        document.status = "ready"
        document.doc_metadata = {
            **(document.doc_metadata or {}),
            "pages_truncated": extracted.pages_processed < extracted.total_pages,
            "plan_page_cap": page_cap,
            "embedding_stack": ai_stack_to_dict(ai_stack)["embeddings"],
        }
        db.commit()
        db.refresh(document)
        return document
    except Exception as exc:
        document.status = "failed"
        document.error_message = str(exc)
        db.commit()
        db.refresh(document)
        if raise_on_error:
            raise
        return document
