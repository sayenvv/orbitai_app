from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.plan_limits import get_plan_token_limit
from app.models import User


@dataclass(slots=True)
class TokenUsageSnapshot:
    plan: str
    tokens_used: int
    tokens_limit: int | None
    tokens_remaining: int | None
    period_start: datetime
    period_end: datetime
    usage_percent: float
    limit_reached: bool


def _month_bounds(now: datetime | None = None) -> tuple[datetime, datetime]:
    now = now or datetime.now(UTC)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def estimate_tokens(text: str) -> int:
    stripped = text.strip()
    if not stripped:
        return 0
    return max(1, len(stripped) // 4)


def estimate_turn_tokens(*, user_message: str, assistant_message: str) -> int:
    return estimate_tokens(user_message) + estimate_tokens(assistant_message)


def ensure_current_period(db: Session, user: User) -> None:
    period_start, _ = _month_bounds()
    if user.tokens_period_start is None or user.tokens_period_start < period_start:
        user.tokens_used = 0
        user.tokens_period_start = period_start
        db.commit()
        db.refresh(user)


def get_usage_snapshot(user: User) -> TokenUsageSnapshot:
    limit = get_plan_token_limit(user.plan)
    period_start, period_end = _month_bounds()
    if user.tokens_period_start and user.tokens_period_start >= period_start:
        period_start = user.tokens_period_start

    tokens_used = user.tokens_used
    limit_reached = limit is not None and tokens_used >= limit

    if limit_reached and limit is not None:
        tokens_used = limit
        tokens_remaining = 0
        usage_percent = 100.0
    else:
        tokens_remaining = None if limit is None else max(0, limit - tokens_used)
        usage_percent = 0.0 if not limit else min(100.0, round((tokens_used / limit) * 100, 1))

    return TokenUsageSnapshot(
        plan=user.plan,
        tokens_used=tokens_used,
        tokens_limit=limit,
        tokens_remaining=tokens_remaining,
        period_start=period_start,
        period_end=period_end,
        usage_percent=usage_percent,
        limit_reached=limit_reached,
    )


def can_consume(user: User, additional_tokens: int) -> bool:
    limit = get_plan_token_limit(user.plan)
    if limit is None:
        return True
    return user.tokens_used + additional_tokens <= limit


def bind_user_to_session(db: Session, user: User) -> User:
    """Re-attach a User loaded in another session (e.g. request-scoped deps)."""
    bound = db.get(User, user.id)
    if bound is None:
        raise ValueError(f"User {user.id} not found")
    return bound


def record_usage(db: Session, user: User, tokens: int) -> TokenUsageSnapshot:
    user = bind_user_to_session(db, user)
    ensure_current_period(db, user)
    user.tokens_used += max(0, tokens)
    db.commit()
    db.refresh(user)
    return get_usage_snapshot(user)
