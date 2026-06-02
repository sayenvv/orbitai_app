from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models import PhotoStudioWorkspace
from clovai_apps.photo_studio.workspace_schemas import (
    PhotoStudioWorkspaceCreateRequest,
    PhotoStudioWorkspaceResponse,
    PhotoStudioWorkspaceState,
    PhotoStudioWorkspaceSummary,
    PhotoStudioWorkspaceUpdateRequest,
)


def _to_ms(value: datetime) -> int:
    return int(value.timestamp() * 1000)


def default_workspace_state(
    *,
    title: str = "Untitled project",
    asset_id: str | None = None,
    asset_name: str | None = None,
) -> PhotoStudioWorkspaceState:
    return PhotoStudioWorkspaceState(
        title=title,
        asset_id=asset_id,
        asset_name=asset_name,
        project_name=title,
    )


def serialize_workspace(row: PhotoStudioWorkspace) -> PhotoStudioWorkspaceResponse:
    raw_state = row.state if isinstance(row.state, dict) else {}
    state = PhotoStudioWorkspaceState.model_validate(
        {
            **raw_state,
            "title": raw_state.get("title") or row.title,
            "assetId": str(row.asset_id) if row.asset_id else raw_state.get("assetId"),
            "assetName": row.asset_name or raw_state.get("assetName"),
            "projectName": raw_state.get("projectName") or row.title,
        }
    )
    return PhotoStudioWorkspaceResponse(
        id=str(row.id),
        title=row.title,
        asset_id=str(row.asset_id) if row.asset_id else None,
        asset_name=row.asset_name,
        opened_at=_to_ms(row.last_opened_at),
        updated_at=_to_ms(row.updated_at),
        state=state,
    )


def serialize_workspace_summary(row: PhotoStudioWorkspace) -> PhotoStudioWorkspaceSummary:
    state = row.state if isinstance(row.state, dict) else {}
    return PhotoStudioWorkspaceSummary(
        id=str(row.id),
        title=row.title,
        asset_id=str(row.asset_id) if row.asset_id else None,
        asset_name=row.asset_name,
        aspect_ratio=str(state.get("aspectRatio") or state.get("aspect_ratio") or "1:1"),
        opened_at=_to_ms(row.last_opened_at),
        updated_at=_to_ms(row.updated_at),
    )


def create_workspace(
    db: Session,
    user_id: uuid.UUID,
    body: PhotoStudioWorkspaceCreateRequest,
) -> PhotoStudioWorkspaceResponse:
    title = (body.title or body.asset_name or "Untitled project").strip() or "Untitled project"
    asset_uuid = uuid.UUID(body.asset_id) if body.asset_id else None
    state = body.state or default_workspace_state(
        title=title,
        asset_id=body.asset_id,
        asset_name=body.asset_name,
    )
    state = state.model_copy(
        update={
            "title": title,
            "asset_id": body.asset_id,
            "asset_name": body.asset_name,
            "project_name": state.project_name or title,
        }
    )

    row = PhotoStudioWorkspace(
        id=uuid.uuid4(),
        user_id=user_id,
        title=title,
        asset_id=asset_uuid,
        asset_name=body.asset_name,
        state=state.model_dump(by_alias=True),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize_workspace(row)


def list_workspaces(db: Session, user_id: uuid.UUID, *, limit: int = 20) -> list[PhotoStudioWorkspaceSummary]:
    rows = (
        db.query(PhotoStudioWorkspace)
        .filter(PhotoStudioWorkspace.user_id == user_id)
        .order_by(PhotoStudioWorkspace.last_opened_at.desc())
        .limit(limit)
        .all()
    )
    return [serialize_workspace_summary(row) for row in rows]


def get_workspace(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    *,
    touch: bool = True,
) -> PhotoStudioWorkspace | None:
    row = (
        db.query(PhotoStudioWorkspace)
        .filter(PhotoStudioWorkspace.id == workspace_id, PhotoStudioWorkspace.user_id == user_id)
        .first()
    )
    if not row:
        return None
    if touch:
        row.last_opened_at = datetime.now(UTC)
        db.commit()
        db.refresh(row)
    return row


def update_workspace(
    db: Session,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    body: PhotoStudioWorkspaceUpdateRequest,
) -> PhotoStudioWorkspaceResponse | None:
    row = (
        db.query(PhotoStudioWorkspace)
        .filter(PhotoStudioWorkspace.id == workspace_id, PhotoStudioWorkspace.user_id == user_id)
        .first()
    )
    if not row:
        return None

    if body.title is not None:
        row.title = body.title.strip() or row.title
    if body.asset_id is not None:
        row.asset_id = uuid.UUID(body.asset_id) if body.asset_id else None
    if body.asset_name is not None:
        row.asset_name = body.asset_name

    if body.state is not None:
        merged = {
            **(row.state if isinstance(row.state, dict) else {}),
            **body.state.model_dump(by_alias=True),
        }
        if body.title is not None:
            merged["title"] = row.title
            merged["projectName"] = merged.get("projectName") or row.title
        row.state = merged
        if not body.title and merged.get("projectName"):
            row.title = str(merged["projectName"]).strip() or row.title

    if body.touch:
        row.last_opened_at = datetime.now(UTC)

    db.commit()
    db.refresh(row)
    return serialize_workspace(row)


def delete_workspace(db: Session, user_id: uuid.UUID, workspace_id: uuid.UUID) -> bool:
    row = (
        db.query(PhotoStudioWorkspace)
        .filter(PhotoStudioWorkspace.id == workspace_id, PhotoStudioWorkspace.user_id == user_id)
        .first()
    )
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True
