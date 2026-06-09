from __future__ import annotations

import sys
import uuid
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import CodeWorkspaceUserSettings
from clovai_apps.code_workspace.schemas import CodeWorkspacePreferences, CodeWorkspaceSettingsUpdateRequest


def default_storage_root() -> Path:
    configured = settings.code_workspace_data_dir.strip()
    if configured:
        path = Path(configured).expanduser()
        if not path.is_absolute():
            path = Path.home() / path
        return path

    if sys.platform == "win32":
        return Path("C:/clovops-workspace")

    return Path.home() / "clovops-workspace"


def resolve_storage_root(db: Session, user_id: uuid.UUID) -> Path:
    row = (
        db.query(CodeWorkspaceUserSettings)
        .filter(CodeWorkspaceUserSettings.user_id == user_id)
        .first()
    )
    if row and row.storage_root_path and row.storage_root_path.strip():
        path = Path(row.storage_root_path.strip()).expanduser()
        if not path.is_absolute():
            path = Path.home() / path
    else:
        path = default_storage_root()

    path = path.resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def project_path(storage_root: Path, user_id: uuid.UUID, project_id: uuid.UUID) -> Path:
    return storage_root / str(user_id) / str(project_id)


def _parse_preferences(raw: dict[str, Any] | None) -> CodeWorkspacePreferences:
    if not isinstance(raw, dict) or not raw:
        return CodeWorkspacePreferences()
    return CodeWorkspacePreferences.model_validate(raw)


def _get_or_create_row(db: Session, user_id: uuid.UUID) -> CodeWorkspaceUserSettings:
    row = (
        db.query(CodeWorkspaceUserSettings)
        .filter(CodeWorkspaceUserSettings.user_id == user_id)
        .first()
    )
    if row is None:
        row = CodeWorkspaceUserSettings(
            id=uuid.uuid4(),
            user_id=user_id,
            storage_root_path=None,
            preferences={},
        )
        db.add(row)
        db.flush()
    return row


def get_user_settings(db: Session, user_id: uuid.UUID) -> dict:
    row = (
        db.query(CodeWorkspaceUserSettings)
        .filter(CodeWorkspaceUserSettings.user_id == user_id)
        .first()
    )
    effective = str(resolve_storage_root(db, user_id))
    configured = row.storage_root_path.strip() if row and row.storage_root_path else None
    default_path = str(default_storage_root().expanduser().resolve())
    preferences = _parse_preferences(row.preferences if row else None)

    return {
        "storageRootPath": configured,
        "effectiveStorageRootPath": effective,
        "defaultStorageRootPath": default_path,
        "preferences": preferences.model_dump(by_alias=True),
    }


def _validate_storage_path(storage_root_path: str | None) -> str | None:
    normalized = (storage_root_path or "").strip()
    if not normalized:
        return None

    candidate = Path(normalized).expanduser()
    if not candidate.is_absolute():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Storage path must be an absolute path (e.g. C:\\clovops-workspace or /Users/you/clovops-workspace).",
        )
    try:
        candidate.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create or access storage path: {exc}",
        ) from exc
    return normalized


def update_user_settings(
    db: Session,
    user_id: uuid.UUID,
    body: CodeWorkspaceSettingsUpdateRequest,
) -> dict:
    row = _get_or_create_row(db, user_id)

    if body.storage_root_path is not None:
        row.storage_root_path = _validate_storage_path(body.storage_root_path)

    if body.preferences is not None:
        row.preferences = body.preferences.model_dump(by_alias=True)

    db.commit()
    db.refresh(row)
    return get_user_settings(db, user_id)
