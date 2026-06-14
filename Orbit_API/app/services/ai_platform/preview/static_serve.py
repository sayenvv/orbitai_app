"""Serve generated workspace files for static HTML previews."""

from __future__ import annotations

import mimetypes
from pathlib import Path

from app.services.ai_platform.tools.file_tools import _safe_path

_PREVIEW_SKIP_DIRS = {".checkpoints", "artifacts", "node_modules", ".git"}


def resolve_workspace_preview_file(workspace_path: str, rel_path: str) -> Path:
    root = Path(workspace_path).resolve()
    if not root.is_dir():
        raise FileNotFoundError("Workspace not found.")

    rel = (rel_path or "").strip("/")
    if not rel:
        return _pick_index(root)

    parts = Path(rel).parts
    if parts and parts[0] in _PREVIEW_SKIP_DIRS:
        raise FileNotFoundError("Path not available.")

    target = _safe_path(workspace_path, rel)
    if target.is_dir():
        return _pick_index(target)
    if not target.is_file():
        raise FileNotFoundError("File not found.")
    return target


def _pick_index(directory: Path) -> Path:
    for name in ("index.html", "index.htm"):
        candidate = directory / name
        if candidate.is_file():
            return candidate
    raise FileNotFoundError("Index not found.")


def guess_preview_media_type(path: Path) -> str:
    media_type, _ = mimetypes.guess_type(str(path))
    return media_type or "application/octet-stream"


def is_static_workspace(workspace_path: str) -> bool:
    root = Path(workspace_path)
    if not root.is_dir():
        return False
    if (root / "package.json").exists():
        return False
    return (root / "index.html").is_file() or (root / "index.htm").is_file()
