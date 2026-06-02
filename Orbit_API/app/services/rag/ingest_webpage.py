from __future__ import annotations

import uuid
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.models import RagChunk, RagDocument, User
from app.services.plan_ai_stack import ai_stack_to_dict, get_plan_ai_stack
from app.services.rag.chunking import chunk_pages
from app.services.rag.embeddings import embed_texts
from app.services.rag.ingest import save_upload_file


def _display_filename(title: str, url: str) -> str:
    host = urlparse(url).hostname or "webpage"
    safe_title = "".join(ch if ch.isalnum() or ch in " -_" else " " for ch in title).strip()
    if safe_title:
        return f"{safe_title[:120]}.web"
    return f"{host}.web"


def ingest_webpage_document(
    db: Session,
    *,
    user: User,
    url: str,
    title: str,
    text: str,
    conversation_id: uuid.UUID | None = None,
) -> RagDocument:
    document_id = uuid.uuid4()
    filename = _display_filename(title, url)
    data = text.encode("utf-8")
    storage_path = save_upload_file(
        user_id=user.id,
        document_id=document_id,
        filename=f"{filename}.txt",
        data=data,
    )

    document = RagDocument(
        id=document_id,
        user_id=user.id,
        conversation_id=conversation_id,
        original_filename=filename,
        mime_type="text/html",
        storage_path=str(storage_path),
        file_size_bytes=len(data),
        status="processing",
        page_count=1,
        doc_metadata={
            "source_kind": "webpage",
            "source_url": url,
            "source_title": title,
        },
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        chunks = chunk_pages([(1, text)])
        if not chunks:
            raise ValueError("No indexable content found on this page.")

        ai_stack = get_plan_ai_stack(db, user.plan)
        vectors = embed_texts([chunk.content for chunk in chunks], stack=ai_stack)
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

        document.pages_processed = 1
        document.chunk_count = len(chunks)
        document.status = "ready"
        document.doc_metadata = {
            **(document.doc_metadata or {}),
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
        raise
