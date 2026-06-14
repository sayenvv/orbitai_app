"""Filesystem workspace operations."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from app.services.ai_platform.tools.workspace_paths import iter_workspace_paths


def _safe_path(workspace_path: str, relative_path: str) -> Path:
    root = Path(workspace_path).resolve()
    target = (root / relative_path).resolve()
    if root not in target.parents and target != root:
        raise ValueError(f"Path escapes workspace: {relative_path}")
    return target


def write_workspace_files(workspace_path: str, files: list[dict[str, Any]]) -> list[str]:
    written: list[str] = []
    for item in files:
        path = str(item.get("path") or item.get("file_path") or "").strip()
        if not path:
            continue
        content = str(item.get("content") or "")
        target = _safe_path(workspace_path, path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        written.append(path)
    return written


def read_workspace_file(workspace_path: str, file_path: str, *, max_chars: int = 12000) -> dict[str, Any]:
    target = _safe_path(workspace_path, file_path)
    if not target.exists():
        raise FileNotFoundError(file_path)
    content = target.read_text(encoding="utf-8", errors="ignore")
    if len(content) > max_chars:
        content = content[:max_chars] + "\n…"
    return {"path": file_path, "content": content}


def list_file_tree(workspace_path: str, *, max_entries: int = 500) -> list[str]:
    root = Path(workspace_path)
    if not root.exists():
        return []
    entries: list[str] = []
    for path in iter_workspace_paths(root):
        rel = str(path.relative_to(root))
        if path.is_dir():
            entries.append(f"{rel}/")
        else:
            entries.append(rel)
        if len(entries) >= max_entries:
            break
    return entries


def apply_patch(workspace_path: str, patches: list[dict[str, Any]]) -> list[str]:
    updated: list[str] = []
    for patch in patches:
        path = str(patch.get("path") or "").strip()
        if not path:
            continue
        operation = str(patch.get("operation") or "replace").lower()
        target = _safe_path(workspace_path, path)
        if operation == "delete":
            if target.exists():
                target.unlink()
            updated.append(path)
            continue
        content = str(patch.get("content") or "")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        updated.append(path)
    return updated


def checksum_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def snapshot_metadata(workspace_path: str) -> dict[str, Any]:
    root = Path(workspace_path)
    files: list[dict[str, str]] = []
    for path in iter_workspace_paths(root, files_only=True):
        rel = str(path.relative_to(root))
        files.append({"path": rel, "checksum": checksum_file(path)})
    return {"files": files}


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
