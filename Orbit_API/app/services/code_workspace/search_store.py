from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.services.code_workspace.file_store import node_relative_path, read_file_content
from app.services.code_workspace.project_store import get_project, parse_project_state
from clovai_apps.code_workspace.schemas import CodeWorkspaceSearchRequest, CodeWorkspaceSearchResponse
from clovai_apps.code_workspace.search import search_project_nodes


def search_project_files(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceSearchRequest,
) -> CodeWorkspaceSearchResponse:
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    nodes = state.nodes

    query = body.query.strip()
    if not query:
        return CodeWorkspaceSearchResponse(query=query, results=[])

    file_contents: dict[str, str] = {}
    if body.mode in {"all", "content"}:
        for node in nodes:
            if node.kind != "file":
                continue
            file_contents[node.id] = read_file_content(db, user_id, project_id, nodes, node.id)

    results = search_project_nodes(
        nodes,
        file_contents,
        query,
        case_sensitive=body.case_sensitive,
        max_results=body.max_results,
        mode=body.mode,
        resolve_path=lambda node_id: node_relative_path(nodes, node_id),
    )

    return CodeWorkspaceSearchResponse(query=query, results=results, total=len(results))
