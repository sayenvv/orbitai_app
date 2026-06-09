from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import CodeWorkspaceProject
from app.services.code_workspace.file_store import (
    create_node_on_disk,
    delete_project_directory,
    rename_node_on_disk,
    sync_structure_to_disk,
)
from clovai_apps.code_workspace.schemas import (
    CodeWorkspaceNode,
    CodeWorkspaceNodeCreateRequest,
    CodeWorkspaceNodeUpdateRequest,
    CodeWorkspaceProjectCreateRequest,
    CodeWorkspaceProjectResponse,
    CodeWorkspaceProjectSummary,
    CodeWorkspaceProjectUpdateRequest,
    CodeWorkspaceState,
    CodeWorkspaceStructureUpdateRequest,
    CodeWorkspaceUiState,
)

_DEMO_NODES: list[dict] = [
    {"id": "folder-src", "kind": "folder", "name": "src", "parentId": None},
    {"id": "file-client", "kind": "file", "name": "client.ts", "parentId": "folder-src", "language": "typescript"},
    {"id": "file-factory", "kind": "file", "name": "factory.ts", "parentId": "folder-src", "language": "typescript"},
    {"id": "file-rate", "kind": "file", "name": "rate-limiter.ts", "parentId": "folder-src", "language": "typescript"},
    {"id": "file-types", "kind": "file", "name": "types.ts", "parentId": "folder-src", "language": "typescript"},
    {"id": "file-utils", "kind": "file", "name": "utils.ts", "parentId": "folder-src", "language": "typescript"},
    {"id": "file-index", "kind": "file", "name": "index.ts", "parentId": None, "language": "typescript"},
    {"id": "file-package", "kind": "file", "name": "package.json", "parentId": None, "language": "json"},
    {"id": "file-tsconfig", "kind": "file", "name": "tsconfig.json", "parentId": None, "language": "json"},
    {"id": "file-readme", "kind": "file", "name": "README.md", "parentId": None, "language": "markdown"},
]


def _to_ms(value: datetime) -> int:
    return int(value.timestamp() * 1000)


def _persist_nodes(nodes: list[CodeWorkspaceNode]) -> list[CodeWorkspaceNode]:
    return [
        CodeWorkspaceNode(
            id=node.id,
            kind=node.kind,
            name=node.name,
            parent_id=node.parent_id,
            language=node.language if node.kind == "file" else None,
        )
        for node in nodes
    ]


def _migrate_ui_payload(ui: dict) -> dict:
    if "explorerFocusId" not in ui and "selectedFolderId" in ui:
        ui = {**ui, "explorerFocusId": ui.get("selectedFolderId")}
    open_ids = ui.get("openFileIds")
    if isinstance(open_ids, list) and len(open_ids) > 1:
        active_id = ui.get("activeFileId")
        ui = {**ui, "openFileIds": [active_id] if active_id else open_ids[:1]}
    return ui


def parse_project_state(raw: dict | None) -> CodeWorkspaceState:
    if not isinstance(raw, dict):
        return CodeWorkspaceState()
    payload = dict(raw)
    if isinstance(payload.get("ui"), dict):
        payload["ui"] = _migrate_ui_payload(payload["ui"])
    state = CodeWorkspaceState.model_validate(payload)
    return CodeWorkspaceState(nodes=_persist_nodes(state.nodes), ui=state.ui)


def _dump_state(state: CodeWorkspaceState) -> dict:
    return CodeWorkspaceState(
        nodes=_persist_nodes(state.nodes),
        ui=state.ui,
    ).model_dump(by_alias=True)


def default_demo_state() -> CodeWorkspaceState:
    return CodeWorkspaceState(
        nodes=[CodeWorkspaceNode.model_validate(node) for node in _DEMO_NODES],
        ui=CodeWorkspaceUiState(
            explorer_focus_id=None,
            active_file_id="file-client",
            expanded_folder_ids=["folder-src"],
            open_file_ids=["file-client"],
        ),
    )


def _node_index(nodes: list[CodeWorkspaceNode], node_id: str) -> int:
    for index, node in enumerate(nodes):
        if node.id == node_id:
            return index
    return -1


def _validate_parent(nodes: list[CodeWorkspaceNode], parent_id: str | None) -> None:
    if parent_id is None:
        return
    parent = next((node for node in nodes if node.id == parent_id), None)
    if parent is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent folder not found.")
    if parent.kind != "folder":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent must be a folder.")


def _validate_unique_name(
    nodes: list[CodeWorkspaceNode],
    name: str,
    parent_id: str | None,
    *,
    exclude_id: str | None = None,
) -> None:
    normalized = name.strip()
    for node in nodes:
        if exclude_id and node.id == exclude_id:
            continue
        if node.parent_id == parent_id and node.name == normalized:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name already exists in folder.")


def serialize_project(row: CodeWorkspaceProject) -> CodeWorkspaceProjectResponse:
    return CodeWorkspaceProjectResponse(
        id=str(row.id),
        title=row.title,
        description=row.description,
        updated_at=_to_ms(row.updated_at),
        state=parse_project_state(row.state),
    )


def serialize_summary(row: CodeWorkspaceProject) -> CodeWorkspaceProjectSummary:
    return CodeWorkspaceProjectSummary(
        id=str(row.id),
        title=row.title,
        description=row.description,
        updated_at=_to_ms(row.updated_at),
    )


def list_projects(db: Session, user_id: uuid.UUID, *, limit: int = 20) -> list[CodeWorkspaceProjectSummary]:
    rows = (
        db.query(CodeWorkspaceProject)
        .filter(CodeWorkspaceProject.user_id == user_id)
        .order_by(CodeWorkspaceProject.updated_at.desc())
        .limit(limit)
        .all()
    )
    return [serialize_summary(row) for row in rows]


def get_project(db: Session, user_id: uuid.UUID, project_id: uuid.UUID) -> CodeWorkspaceProject:
    row = (
        db.query(CodeWorkspaceProject)
        .filter(CodeWorkspaceProject.id == project_id, CodeWorkspaceProject.user_id == user_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    row.last_opened_at = datetime.now(UTC)
    db.commit()
    db.refresh(row)
    return row


def create_project(
    db: Session,
    user_id: uuid.UUID,
    body: CodeWorkspaceProjectCreateRequest,
) -> CodeWorkspaceProjectResponse:
    title = body.title.strip() or "Untitled project"
    state = default_demo_state() if body.seed_demo else CodeWorkspaceState()
    row = CodeWorkspaceProject(
        id=uuid.uuid4(),
        user_id=user_id,
        title=title,
        description=body.description,
        state=_dump_state(state),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    sync_structure_to_disk(db, user_id, row.id, parse_project_state(row.state).nodes)
    return serialize_project(row)


def update_project_metadata(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceProjectUpdateRequest,
) -> CodeWorkspaceProjectResponse:
    row = get_project(db, user_id, project_id)
    if body.title is not None:
        row.title = body.title.strip() or row.title
    if body.description is not None:
        row.description = body.description
    db.commit()
    db.refresh(row)
    return serialize_project(row)


def update_project_structure(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceStructureUpdateRequest,
) -> CodeWorkspaceProjectResponse:
    row = get_project(db, user_id, project_id)
    current = parse_project_state(row.state)
    row.state = _dump_state(
        CodeWorkspaceState(
            nodes=_persist_nodes(body.nodes),
            ui=body.ui or current.ui,
        )
    )
    db.commit()
    db.refresh(row)
    sync_structure_to_disk(db, user_id, project_id, parse_project_state(row.state).nodes)
    return serialize_project(row)


def add_project_node(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceNodeCreateRequest,
) -> CodeWorkspaceProjectResponse:
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required.")

    _validate_parent(state.nodes, body.parent_id)
    _validate_unique_name(state.nodes, name, body.parent_id)

    node = CodeWorkspaceNode(
        id=str(uuid.uuid4()),
        kind=body.kind,
        name=name,
        parent_id=body.parent_id,
        language=body.language if body.kind == "file" else None,
    )
    state.nodes.append(node)

    if body.kind == "folder" and body.parent_id:
        expanded = set(state.ui.expanded_folder_ids)
        expanded.add(body.parent_id)
        state.ui.expanded_folder_ids = list(expanded)

    state.ui.explorer_focus_id = node.id
    if body.kind == "folder":
        expanded = set(state.ui.expanded_folder_ids)
        expanded.add(node.id)
        state.ui.expanded_folder_ids = list(expanded)
    else:
        state.ui.active_file_id = node.id
        state.ui.open_file_ids = [node.id]

    row.state = _dump_state(state)
    db.commit()
    db.refresh(row)
    create_node_on_disk(db, user_id, project_id, state.nodes, node)
    return serialize_project(row)


def update_project_node(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    node_id: str,
    body: CodeWorkspaceNodeUpdateRequest,
) -> CodeWorkspaceProjectResponse:
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    index = _node_index(state.nodes, node_id)
    if index < 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found.")

    node = state.nodes[index]
    nodes_before = list(state.nodes)
    if body.name is not None:
        next_name = body.name.strip()
        if not next_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required.")
        _validate_unique_name(state.nodes, next_name, node.parent_id, exclude_id=node.id)
        node = node.model_copy(update={"name": next_name})

    if body.parent_id is not None:
        _validate_parent(state.nodes, body.parent_id)
        _validate_unique_name(state.nodes, node.name, body.parent_id, exclude_id=node.id)
        node = node.model_copy(update={"parent_id": body.parent_id})

    if node.kind == "file" and body.language is not None:
        node = node.model_copy(update={"language": body.language})

    state.nodes[index] = node
    row.state = _dump_state(state)
    db.commit()
    db.refresh(row)
    rename_node_on_disk(db, user_id, project_id, nodes_before, state.nodes, node_id)
    return serialize_project(row)


def delete_project(db: Session, user_id: uuid.UUID, project_id: uuid.UUID) -> None:
    row = get_project(db, user_id, project_id)
    delete_project_directory(db, user_id, project_id)
    db.delete(row)
    db.commit()
