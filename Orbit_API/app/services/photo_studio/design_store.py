from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models import PhotoStudioWorkspace
from clovai_apps.photo_studio.design_schemas import PhotoStudioDesignItem, PhotoStudioDesignListResponse
from clovai_apps.photo_studio.design_templates import get_system_design_templates


def _parse_saved_design(raw: dict) -> PhotoStudioDesignItem | None:
    try:
        return PhotoStudioDesignItem.model_validate({**raw, "source": raw.get("source") or "user"})
    except Exception:
        return None


def _saved_designs_from_state(state: dict | None) -> list[PhotoStudioDesignItem]:
    if not isinstance(state, dict):
        return []
    raw_items = state.get("savedDesigns") or state.get("saved_designs") or []
    if not isinstance(raw_items, list):
        return []
    parsed: list[PhotoStudioDesignItem] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        if item.get("source") == "system":
            continue
        design = _parse_saved_design(item)
        if design:
            parsed.append(design)
    return parsed


def list_photo_studio_designs(
    db: Session,
    user_id: uuid.UUID,
    *,
    workspace_id: uuid.UUID | None = None,
) -> PhotoStudioDesignListResponse:
    templates = get_system_design_templates()
    saved: list[PhotoStudioDesignItem] = []

    if workspace_id is not None:
        row = (
            db.query(PhotoStudioWorkspace)
            .filter(PhotoStudioWorkspace.id == workspace_id, PhotoStudioWorkspace.user_id == user_id)
            .first()
        )
        if row:
            saved = _saved_designs_from_state(row.state if isinstance(row.state, dict) else {})
    else:
        rows = (
            db.query(PhotoStudioWorkspace)
            .filter(PhotoStudioWorkspace.user_id == user_id)
            .order_by(PhotoStudioWorkspace.updated_at.desc())
            .all()
        )
        seen_ids: set[str] = set()
        for row in rows:
            for design in _saved_designs_from_state(row.state if isinstance(row.state, dict) else {}):
                if design.id in seen_ids:
                    continue
                seen_ids.add(design.id)
                saved.append(design)

    return PhotoStudioDesignListResponse(templates=templates, saved=saved)
