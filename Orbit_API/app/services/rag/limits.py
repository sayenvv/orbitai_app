from __future__ import annotations

from app.core.config import settings

PAID_PLANS = frozenset({"starter", "pro", "enterprise"})


def max_pages_for_plan(plan: str) -> int | None:
    """Return max PDF pages to extract per upload. None means no cap."""
    normalized = plan.strip().lower()
    if normalized in PAID_PLANS:
        return None
    return settings.rag_free_max_pages
