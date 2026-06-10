from __future__ import annotations

import re
import uuid

from sqlalchemy.orm import Session

from app.services.code_workspace.file_store import node_relative_path
from app.services.code_workspace.project_store import get_project, parse_project_state


def build_project_file_map(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
) -> list[dict]:
    """Project indexing agent — file map with path metadata (embeddings later)."""
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    file_map: list[dict] = []

    for node in state.nodes:
        if node.kind != "file":
            continue
        file_map.append(
            {
                "fileId": node.id,
                "filePath": node_relative_path(state.nodes, node.id),
                "language": node.language,
                "name": node.name,
            }
        )

    return sorted(file_map, key=lambda item: item["filePath"])


def _query_tokens(query: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z0-9_.-]+", query.lower())
    return [token for token in tokens if len(token) >= 2]


def search_file_map(file_map: list[dict], query: str, *, max_results: int = 12) -> list[dict]:
    """Fallback code search using indexed file map when content search returns nothing."""
    tokens = _query_tokens(query)
    if not tokens:
        return []

    scored: list[tuple[int, dict]] = []
    for item in file_map:
        path = str(item.get("filePath") or "").lower()
        name = str(item.get("name") or "").lower()
        score = 0
        for token in tokens:
            if token in path or token in name:
                score += 2 if token in name else 1
        if score > 0:
            scored.append((score, item))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    results: list[dict] = []
    for _, item in scored[:max_results]:
        results.append(
            {
                "fileId": item["fileId"],
                "filePath": item["filePath"],
                "line": 1,
                "column": 1,
                "lineText": item.get("name") or item["filePath"],
                "matchStart": 0,
                "matchEnd": 0,
                "kind": "filename",
            }
        )
    return results
