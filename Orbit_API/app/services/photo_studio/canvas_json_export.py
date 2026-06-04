from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.core.config import settings
from clovai_apps.photo_studio.canvas_export_schemas import (
    PhotoStudioCanvasExportPayload,
    PhotoStudioCanvasExportRequest,
    PhotoStudioCanvasExportResponse,
)


def _export_root() -> Path:
    root = Path(settings.photo_studio_canvas_export_dir)
    if not root.is_absolute():
        root = Path.cwd() / root
    return root


def _file_key(body: PhotoStudioCanvasExportRequest) -> str:
    if body.workspace_id:
        return f"workspace-{body.workspace_id}"
    draft = (body.draft_id or "draft").strip() or "draft"
    return f"draft-{draft}"


def _resolve_target(user_id: uuid.UUID, body: PhotoStudioCanvasExportRequest) -> Path:
    user_dir = _export_root() / str(user_id)
    file_name = f"{_file_key(body)}-canvas.json"
    return user_dir / file_name


def load_canvas_layers_json(
    user_id: uuid.UUID,
    *,
    workspace_id: str | None = None,
    draft_id: str | None = None,
) -> PhotoStudioCanvasExportPayload | None:
    if not settings.photo_studio_canvas_export_enabled:
        return None

    body = PhotoStudioCanvasExportRequest(
        workspace_id=workspace_id,
        draft_id=draft_id,
        canvas_shapes=[],
        canvas_texts=[],
    )
    target = _resolve_target(user_id, body)
    if not target.is_file():
        return None

    try:
        data = json.loads(target.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None

    if not isinstance(data, dict):
        return None
    return PhotoStudioCanvasExportPayload.model_validate(data)


def save_canvas_layers_json(
    user_id: uuid.UUID,
    body: PhotoStudioCanvasExportRequest,
) -> PhotoStudioCanvasExportResponse:
    if not settings.photo_studio_canvas_export_enabled:
        raise RuntimeError("Photo Studio canvas JSON export is disabled.")

    user_dir = _export_root() / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)

    target = _resolve_target(user_id, body)
    file_name = target.name

    payload: dict[str, Any] = {
        "exportedAt": datetime.now(UTC).isoformat(),
        "workspaceId": body.workspace_id,
        "draftId": body.draft_id,
        "projectName": body.project_name,
        "aspectRatio": body.aspect_ratio,
        "canvasBackgroundId": body.canvas_background_id,
        "customCanvasBackgroundColor": body.custom_canvas_background_color,
        "customCanvasGradientEnd": body.custom_canvas_gradient_end,
        "customCanvasGradientEnabled": body.custom_canvas_gradient_enabled,
        "canvasShapes": body.canvas_shapes,
        "canvasTexts": body.canvas_texts,
    }

    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    relative = target.relative_to(Path.cwd())
    return PhotoStudioCanvasExportResponse(
        file_name=file_name,
        relative_path=str(relative),
    )
