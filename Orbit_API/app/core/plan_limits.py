"""Plan token limits — DB-backed with env fallback."""

from __future__ import annotations

from app.core.config import settings

PLANS = ("free", "starter", "pro", "enterprise")

_limits_cache: dict[str, int | None] | None = None


def invalidate_plan_limits_cache() -> None:
    global _limits_cache
    _limits_cache = None


def coerce_token_limit(value: int) -> int | None:
    """0 or negative means unlimited."""
    return None if value <= 0 else value


def _env_defaults() -> dict[str, int | None]:
    return {
        "free": settings.free_plan_token_limit,
        "starter": coerce_token_limit(settings.starter_plan_token_limit),
        "pro": coerce_token_limit(settings.pro_plan_token_limit),
        "enterprise": coerce_token_limit(settings.enterprise_plan_token_limit),
    }


def _load_from_db() -> dict[str, int | None] | None:
    from app.db.session import SessionLocal
    from app.models import PlanLimit
    from app.services.plan_limit_store import ensure_plan_limits

    db = SessionLocal()
    try:
        rows = ensure_plan_limits(db)
        if not rows:
            return None
        return {row.plan: coerce_token_limit(row.token_limit) for row in rows}
    finally:
        db.close()


def get_all_plan_token_limits() -> dict[str, int | None]:
    global _limits_cache
    if _limits_cache is not None:
        return _limits_cache

    db_limits = _load_from_db()
    if db_limits:
        _limits_cache = db_limits
        return _limits_cache

    _limits_cache = _env_defaults()
    return _limits_cache


def get_plan_token_limit(plan: str) -> int | None:
    normalized = (plan or "free").strip().lower()
    limits = get_all_plan_token_limits()
    return limits.get(normalized, limits.get("free"))
