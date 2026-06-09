from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.code_workspace.settings_store import project_path, resolve_storage_root
from clovai_apps.code_workspace.schemas import CodeWorkspaceNode

_INVALID_SEGMENTS = {"", ".", ".."}


def _project_root(db: Session, user_id: uuid.UUID, project_id: uuid.UUID) -> Path:
    storage_root = resolve_storage_root(db, user_id)
    return project_path(storage_root, user_id, project_id)


def _safe_segment(name: str) -> str:
    segment = name.strip()
    if segment in _INVALID_SEGMENTS or "/" in segment or "\\" in segment:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file or folder name.")
    return segment


def node_relative_path(nodes: list[CodeWorkspaceNode], node_id: str) -> str:
    node = next((item for item in nodes if item.id == node_id), None)
    if node is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")

    parts: list[str] = []
    current: CodeWorkspaceNode | None = node
    while current is not None:
        parts.insert(0, _safe_segment(current.name))
        if current.parent_id is None:
            break
        current = next((item for item in nodes if item.id == current.parent_id), None)
        if current is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid project tree.")

    return "/".join(parts)


def resolve_node_path(root: Path, nodes: list[CodeWorkspaceNode], node_id: str) -> Path:
    relative = node_relative_path(nodes, node_id)
    target = (root / relative).resolve()
    root_resolved = root.resolve()
    if target != root_resolved and root_resolved not in target.parents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid project path.")
    return target


def ensure_project_directory(db: Session, user_id: uuid.UUID, project_id: uuid.UUID) -> Path:
    if not settings.code_workspace_persistence_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Code workspace persistence is disabled on this server.",
        )

    path = _project_root(db, user_id, project_id)
    path.mkdir(parents=True, exist_ok=True)
    return path


def sync_structure_to_disk(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    nodes: list[CodeWorkspaceNode],
) -> None:
    root = ensure_project_directory(db, user_id, project_id)

    for node in nodes:
        target = resolve_node_path(root, nodes, node.id)
        if node.kind == "folder":
            target.mkdir(parents=True, exist_ok=True)
            continue

        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            target.write_text("", encoding="utf-8")


def create_node_on_disk(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    nodes: list[CodeWorkspaceNode],
    node: CodeWorkspaceNode,
) -> None:
    root = ensure_project_directory(db, user_id, project_id)
    target = resolve_node_path(root, nodes, node.id)

    if node.kind == "folder":
        target.mkdir(parents=True, exist_ok=True)
        return

    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        target.write_text("", encoding="utf-8")


def rename_node_on_disk(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    nodes_before: list[CodeWorkspaceNode],
    nodes_after: list[CodeWorkspaceNode],
    node_id: str,
) -> None:
    root = _project_root(db, user_id, project_id)
    if not root.is_dir():
        return

    old_path = resolve_node_path(root, nodes_before, node_id)
    new_path = resolve_node_path(root, nodes_after, node_id)
    if old_path == new_path:
        return

    if not old_path.exists():
        node = next((item for item in nodes_after if item.id == node_id), None)
        if node is not None:
            create_node_on_disk(db, user_id, project_id, nodes_after, node)
        return

    new_path.parent.mkdir(parents=True, exist_ok=True)
    old_path.rename(new_path)


def read_file_content(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    nodes: list[CodeWorkspaceNode],
    node_id: str,
) -> str:
    node = next((item for item in nodes if item.id == node_id), None)
    if node is None or node.kind != "file":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    root = _project_root(db, user_id, project_id)
    path = resolve_node_path(root, nodes, node_id)
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")


def write_file_content(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    nodes: list[CodeWorkspaceNode],
    node_id: str,
    content: str,
) -> None:
    node = next((item for item in nodes if item.id == node_id), None)
    if node is None or node.kind != "file":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    root = ensure_project_directory(db, user_id, project_id)
    path = resolve_node_path(root, nodes, node_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def delete_project_directory(db: Session, user_id: uuid.UUID, project_id: uuid.UUID) -> None:
    path = _project_root(db, user_id, project_id)
    if path.is_dir():
        shutil.rmtree(path)
