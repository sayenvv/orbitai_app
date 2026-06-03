from __future__ import annotations

import json
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import settings
from clovai_apps.project_planning.schemas import ProjectPlanningDocument


def _data_root() -> Path:
    root = Path(settings.project_planning_data_dir)
    if not root.is_absolute():
        root = Path.cwd() / root
    return root


def _templates_dir() -> Path:
    return _data_root() / "_templates"


def _user_dir(user_id: uuid.UUID) -> Path:
    return _data_root() / str(user_id)


def _project_path(user_id: uuid.UUID, project_id: str) -> Path:
    safe_id = project_id.strip().replace("/", "-")
    return _user_dir(user_id) / f"{safe_id}.json"


def _template_path(project_id: str) -> Path:
    safe_id = project_id.strip().replace("/", "-")
    return _templates_dir() / f"{safe_id}.json"


def list_template_project_ids() -> list[str]:
    templates = _templates_dir()
    if not templates.is_dir():
        return []
    return sorted(path.stem for path in templates.glob("*.json"))


def _read_document(path: Path) -> ProjectPlanningDocument | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    if not isinstance(data, dict):
        return None
    return ProjectPlanningDocument.model_validate(data)


def load_project_document(user_id: uuid.UUID, project_id: str) -> ProjectPlanningDocument | None:
    if not settings.project_planning_persistence_enabled:
        return None

    target = _project_path(user_id, project_id)
    document = _read_document(target)
    if document is not None:
        return document

    template = _template_path(project_id)
    seed = _read_document(template)
    if seed is None:
        return None

    _user_dir(user_id).mkdir(parents=True, exist_ok=True)
    shutil.copyfile(template, target)
    return _read_document(target)


def save_project_document(user_id: uuid.UUID, document: ProjectPlanningDocument) -> tuple[Path, str]:
    if not settings.project_planning_persistence_enabled:
        raise RuntimeError("Project planning persistence is disabled.")

    user_dir = _user_dir(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    target = _project_path(user_id, document.id)
    updated_at = datetime.now(UTC).isoformat()
    payload = document.model_dump(by_alias=True, mode="json")
    payload["updatedAt"] = updated_at
    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return target, updated_at
