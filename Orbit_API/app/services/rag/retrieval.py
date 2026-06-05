from __future__ import annotations

import uuid

import numpy as np
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import RagChunk, RagDocument
from app.services.rag.embeddings import embed_query, embedding_stack_from_metadata
from app.services.rag.similarity import batch_cosine_similarity


def retrieve_context(
    db: Session,
    *,
    document_id: uuid.UUID,
    user_id: uuid.UUID,
    query: str,
    top_k: int | None = None,
) -> str:
    document = (
        db.query(RagDocument)
        .filter(RagDocument.id == document_id, RagDocument.user_id == user_id)
        .first()
    )
    if not document:
        return ""
    if document.status != "ready":
        return ""

    stack = embedding_stack_from_metadata(document.doc_metadata)
    query_vector = embed_query(query, stack=stack)
    if not query_vector:
        return ""

    scoring_rows = (
        db.query(
            RagChunk.id,
            RagChunk.chunk_index,
            RagChunk.embedding,
            RagChunk.page_start,
            RagChunk.page_end,
        )
        .filter(RagChunk.document_id == document_id, RagChunk.embedding.is_not(None))
        .order_by(RagChunk.chunk_index)
        .all()
    )
    if not scoring_rows:
        return ""

    limit = top_k or settings.rag_top_k
    embeddings = [row.embedding for row in scoring_rows]
    scores = batch_cosine_similarity(query_vector, embeddings)
    top_indices = np.argsort(scores)[::-1][:limit]

    top_ids = [scoring_rows[int(index)].id for index in top_indices]
    content_by_id = {
        row.id: row.content
        for row in db.query(RagChunk.id, RagChunk.content).filter(RagChunk.id.in_(top_ids)).all()
    }

    top = [
        scoring_rows[int(index)]
        for index in top_indices
        if scoring_rows[int(index)].id in content_by_id
    ]

    parts: list[str] = []
    for index, chunk in enumerate(top, start=1):
        page_label = ""
        if chunk.page_start and chunk.page_end:
            page_label = (
                f" (page {chunk.page_start})"
                if chunk.page_start == chunk.page_end
                else f" (pages {chunk.page_start}-{chunk.page_end})"
            )
        parts.append(f"[Excerpt {index}{page_label}]\n{content_by_id[chunk.id]}")

    header = f"Document: {document.original_filename}"
    if document.doc_metadata.get("pages_truncated"):
        header += (
            f" — note: only the first {document.pages_processed} of "
            f"{document.page_count} pages were indexed on your plan."
        )

    return header + "\n\n" + "\n\n".join(parts)


def build_rag_prompt(*, context: str, user_message: str) -> str:
    return (
        "Answer using the document excerpts below. "
        "If the answer is not supported by the excerpts, say you could not find it in the document.\n\n"
        f"{context}\n\n"
        "---\n"
        f"User question: {user_message}"
    )
