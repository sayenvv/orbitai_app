from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plan_limits import PLANS, coerce_token_limit, invalidate_plan_limits_cache
from app.models import PlanLimit

PLAN_DEFAULTS: dict[str, dict[str, Any]] = {
    "free": {
        "label": "Free",
        "tagline": "Everything you need to explore Orbit",
        "features": [
            "Core AI assistants",
            "Standard response speed",
            "Community support",
        ],
        "highlight": False,
    },
    "starter": {
        "label": "Starter",
        "tagline": "Built for consistent daily use",
        "features": [
            "Everything in Free",
            "Higher monthly allowance",
            "Priority routing",
        ],
        "highlight": False,
    },
    "pro": {
        "label": "Pro",
        "tagline": "For power users who rely on AI daily",
        "features": [
            "Everything in Starter",
            "Maximum token allowance",
            "Early access to new agents",
        ],
        "highlight": True,
    },
    "enterprise": {
        "label": "Enterprise",
        "tagline": "Scale without limits across your team",
        "features": [
            "Unlimited tokens",
            "Dedicated account manager",
            "Custom integrations & SLA",
        ],
        "highlight": False,
    },
}


def env_defaults() -> dict[str, int]:
    return {
        "free": settings.free_plan_token_limit,
        "starter": settings.starter_plan_token_limit,
        "pro": settings.pro_plan_token_limit,
        "enterprise": settings.enterprise_plan_token_limit,
    }


def _normalize_features(features: Any) -> list[str]:
    if not isinstance(features, list):
        return []
    return [str(item).strip() for item in features if str(item).strip()]


def _serialize_plan(row: PlanLimit) -> dict:
    return {
        "plan": row.plan,
        "label": row.label,
        "tagline": row.tagline,
        "features": _normalize_features(row.features),
        "highlight": bool(row.highlight),
        "token_limit": coerce_token_limit(row.token_limit),
        "token_limit_raw": row.token_limit,
        "updated_at": row.updated_at,
    }


def ensure_plan_limits(db: Session) -> list[PlanLimit]:
    rows = db.query(PlanLimit).order_by(PlanLimit.plan).all()
    if rows:
        return rows

    token_defaults = env_defaults()
    for plan in PLANS:
        meta = PLAN_DEFAULTS.get(plan, {})
        db.add(
            PlanLimit(
                plan=plan,
                label=meta.get("label", plan.title()),
                tagline=meta.get("tagline", ""),
                features=_normalize_features(meta.get("features", [])),
                highlight=bool(meta.get("highlight", False)),
                token_limit=token_defaults[plan],
            )
        )
    db.commit()
    invalidate_plan_limits_cache()
    return db.query(PlanLimit).order_by(PlanLimit.plan).all()


def list_plan_limits(db: Session) -> list[dict]:
    rows = ensure_plan_limits(db)
    return [_serialize_plan(row) for row in rows]


def update_plan_limits(db: Session, updates: dict[str, dict[str, Any]]) -> list[dict]:
    ensure_plan_limits(db)
    now = datetime.now(UTC)

    for plan, payload in updates.items():
        normalized = plan.strip().lower()
        if normalized not in PLANS:
            raise ValueError(f"Unknown plan: {plan}")

        row = db.query(PlanLimit).filter(PlanLimit.plan == normalized).first()
        if not row:
            meta = PLAN_DEFAULTS.get(normalized, {})
            row = PlanLimit(
                plan=normalized,
                label=meta.get("label", normalized.title()),
                tagline=meta.get("tagline", ""),
                features=_normalize_features(meta.get("features", [])),
                highlight=bool(meta.get("highlight", False)),
                token_limit=env_defaults()[normalized],
            )
            db.add(row)

        if "token_limit" in payload and payload["token_limit"] is not None:
            token_limit = payload["token_limit"]
            if token_limit < 0:
                raise ValueError(f"Token limit for {plan} must be 0 (unlimited) or positive")
            row.token_limit = token_limit

        if "label" in payload and payload["label"] is not None:
            label = str(payload["label"]).strip()
            if not label:
                raise ValueError(f"Label for {plan} cannot be empty")
            row.label = label

        if "tagline" in payload and payload["tagline"] is not None:
            row.tagline = str(payload["tagline"]).strip()

        if "features" in payload and payload["features"] is not None:
            row.features = _normalize_features(payload["features"])

        if "highlight" in payload and payload["highlight"] is not None:
            row.highlight = bool(payload["highlight"])

        row.updated_at = now

    db.commit()
    invalidate_plan_limits_cache()
    return list_plan_limits(db)
