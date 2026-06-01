from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models import LibraryGeneratedFile, User
from app.orchestration.runner import stream_agent_response
from app.services.agent_registry import AgentRegistry
from app.services.library_store import _serialize_generated
from app.services.rag.document_store import get_user_document
from app.services.rag.retrieval import retrieve_context
from app.services.token_usage import ensure_current_period, estimate_turn_tokens, record_usage

_INSIGHTS_QUERY = (
    "Summarize the main themes, key arguments, important facts, "
    "and actionable insights from this document."
)

_ALLOWED_INSIGHT_TYPES = frozenset({"summary", "keywords", "concepts", "evidence", "questions"})

_DEFAULT_INSIGHT_TYPES = ("summary", "keywords", "concepts", "evidence", "questions")

_INSIGHT_SECTIONS: dict[str, str] = {
    "summary": "**Summary** — 2–4 sentences capturing what the document is about",
    "keywords": "**Keyword themes** — bullet list of important terms and repeated topics",
    "concepts": "**Concept summary** — bullet list of main concepts grouped by theme",
    "evidence": "**Evidence map** — bullet list of claims, methods, data points, and citations",
    "questions": "**Discussion questions** — 3–5 follow-up questions the reader might ask",
}


def _normalize_insight_types(insight_types: list[str] | None) -> list[str]:
    if not insight_types:
        return list(_DEFAULT_INSIGHT_TYPES)
    normalized = [item for item in insight_types if item in _ALLOWED_INSIGHT_TYPES]
    return normalized or list(_DEFAULT_INSIGHT_TYPES)


def _build_insights_user_message(context: str, insight_types: list[str]) -> str:
    sections = "\n".join(
        f"{index + 1}. {_INSIGHT_SECTIONS[item]}"
        for index, item in enumerate(insight_types)
    )
    return f"""Analyze the document excerpts below and write clear AI insights.

Structure your response with these sections:
{sections}

{context}"""


async def generate_upload_insights(
    db: Session,
    *,
    user: User,
    document_id: uuid.UUID,
    insight_types: list[str] | None = None,
) -> dict:
    selected_types = _normalize_insight_types(insight_types)

    document = get_user_document(db, user.id, document_id)
    if not document:
        raise LookupError("Document not found")
    if document.status != "ready":
        raise ValueError("Document is still processing. Try again when indexing completes.")
    if document.chunk_count == 0:
        raise ValueError("This document has no indexed content to analyze.")

    context = retrieve_context(
        db,
        document_id=document.id,
        user_id=user.id,
        query=_INSIGHTS_QUERY,
        top_k=8,
    )
    if not context.strip():
        raise ValueError("Could not retrieve content from this document.")

    registry = AgentRegistry(db)
    agent_config = registry.get_default()
    if not agent_config:
        raise RuntimeError("No active agent is configured.")

    user_message = _build_insights_user_message(context, selected_types)

    parts: list[str] = []
    async for token in stream_agent_response(
        db,
        user_message=user_message,
        agent_slug=agent_config.slug,
        history=[],
        user_id=user.id,
        user_plan=user.plan,
    ):
        parts.append(token)

    full_text = "".join(parts).strip()
    if not full_text:
        raise RuntimeError("Insight generation returned empty content.")

    ensure_current_period(db, user)
    turn_tokens = estimate_turn_tokens(user_message=user_message, assistant_message=full_text)
    record_usage(db, user, turn_tokens)

    title = f"Insights: {document.original_filename}"
    row = LibraryGeneratedFile(
        user_id=user.id,
        agent_id=agent_config.agent_id,
        source_document_id=document.id,
        title=title[:512],
        item_type="AI Insights",
        preview=full_text,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_generated(row)
