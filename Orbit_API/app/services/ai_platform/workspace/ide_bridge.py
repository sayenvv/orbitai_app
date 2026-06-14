"""Import a platform workflow workspace into Orbit Code IDE."""

from __future__ import annotations

import re
import shutil
import uuid
from pathlib import Path
from urllib.parse import quote

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import CodeWorkspaceProject
from app.models.ai_platform import PlatformWorkflowRun
from app.services.ai_platform.tools.workspace_paths import SKIP_DIR_NAMES, iter_workspace_paths
from app.services.code_workspace.file_store import ensure_project_directory, write_file_content
from app.services.code_workspace.project_store import _dump_state, parse_project_state
from clovai_apps.code_workspace.schemas import CodeWorkspaceNode, CodeWorkspaceState, CodeWorkspaceUiState


def _slugify_segment(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "item"


def _infer_language(path: str) -> str | None:
    suffix = Path(path).suffix.lower()
    mapping = {
        ".ts": "typescript",
        ".tsx": "typescript",
        ".js": "javascript",
        ".jsx": "javascript",
        ".py": "python",
        ".html": "html",
        ".css": "css",
        ".json": "json",
        ".md": "markdown",
    }
    return mapping.get(suffix)


def _build_nodes_from_paths(rel_paths: list[str]) -> tuple[list[CodeWorkspaceNode], dict[str, str]]:
    """Build explorer nodes and a rel-path → file node id map."""
    nodes: list[CodeWorkspaceNode] = []
    file_ids: dict[str, str] = {}
    folder_ids: dict[str, str] = {}

    def ensure_folder(path_parts: list[str]) -> str | None:
        if not path_parts:
            return None
        current_path = ""
        parent_id: str | None = None
        for part in path_parts:
            current_path = f"{current_path}/{part}" if current_path else part
            if current_path in folder_ids:
                parent_id = folder_ids[current_path]
                continue
            folder_id = f"folder-{_slugify_segment(current_path)}"
            nodes.append(
                CodeWorkspaceNode(
                    id=folder_id,
                    kind="folder",
                    name=part,
                    parent_id=parent_id,
                )
            )
            folder_ids[current_path] = folder_id
            parent_id = folder_id
        return parent_id

    for index, rel in enumerate(sorted(rel_paths)):
        rel_path = Path(rel)
        if rel_path.name.startswith("."):
            continue
        parts = [segment for segment in rel.split("/") if segment]
        if not parts:
            continue
        file_name = parts[-1]
        parent_id = ensure_folder(parts[:-1])
        file_id = f"file-{_slugify_segment(rel)}-{index}"
        nodes.append(
            CodeWorkspaceNode(
                id=file_id,
                kind="file",
                name=file_name,
                parent_id=parent_id,
                language=_infer_language(rel),
            )
        )
        file_ids[rel] = file_id

    return nodes, file_ids


def import_run_to_code_workspace(
    db: Session,
    *,
    user_id: uuid.UUID,
    run: PlatformWorkflowRun,
) -> CodeWorkspaceProject:
    if not settings.code_workspace_persistence_enabled:
        raise ValueError("Code workspace persistence is disabled on this server.")

    workspace = Path(str(run.workspace_path or ""))
    if not workspace.is_dir():
        raise ValueError("Workflow workspace not found.")

    if run.project_id:
        existing = (
            db.query(CodeWorkspaceProject)
            .filter(CodeWorkspaceProject.id == run.project_id, CodeWorkspaceProject.user_id == user_id)
            .first()
        )
        if existing is not None:
            return existing

    rel_files: list[str] = []
    for path in iter_workspace_paths(workspace, files_only=True):
        rel = str(path.relative_to(workspace))
        if rel.startswith(".checkpoints/") or rel.startswith("artifacts/"):
            continue
        rel_files.append(rel)

    title = (run.input_prompt or "Generated project").strip().splitlines()[0][:80] or "Generated project"
    nodes, file_ids = _build_nodes_from_paths(rel_files)
    file_nodes = [node for node in nodes if node.kind == "file"]
    active_file_id = file_nodes[0].id if file_nodes else None
    state = CodeWorkspaceState(
        nodes=nodes,
        ui=CodeWorkspaceUiState(
            explorer_focus_id=active_file_id,
            active_file_id=active_file_id,
            expanded_folder_ids=[node.id for node in nodes if node.kind == "folder"],
            open_file_ids=[active_file_id] if active_file_id else [],
        ),
    )

    row = CodeWorkspaceProject(
        id=uuid.uuid4(),
        user_id=user_id,
        title=title,
        description=f"Imported from platform run {run.id}",
        state=_dump_state(state),
    )
    db.add(row)
    db.flush()

    dest_root = ensure_project_directory(db, user_id, row.id)
    for path in iter_workspace_paths(workspace, files_only=True):
        rel = path.relative_to(workspace)
        if rel.parts and rel.parts[0] in SKIP_DIR_NAMES | {".checkpoints", "artifacts"}:
            continue
        target = dest_root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)

    parsed = parse_project_state(row.state)
    for rel, node_id in file_ids.items():
        source = workspace / rel
        if not source.is_file():
            continue
        write_file_content(
            db,
            user_id,
            row.id,
            parsed.nodes,
            node_id,
            source.read_text(encoding="utf-8", errors="ignore"),
        )

    run.project_id = row.id
    db.add(run)
    db.commit()
    db.refresh(row)
    return row


def build_open_targets(run: PlatformWorkflowRun, *, project_id: uuid.UUID | None = None) -> dict[str, str]:
    workspace = Path(str(run.workspace_path or "")).resolve()
    file_uri = workspace.as_uri()
    vscode_url = file_uri.replace("file://", "vscode://file/", 1)
    orbit_ide_url = f"/code?projectId={project_id}" if project_id else ""
    return {
        "workspace_path": str(workspace),
        "vscode_url": vscode_url,
        "orbit_ide_url": orbit_ide_url,
    }
