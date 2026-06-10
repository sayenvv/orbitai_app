from __future__ import annotations

import uuid

from app.services.code_workspace.code_review import validate_source_syntax
from app.services.code_workspace.file_resolver import find_file_node
from app.services.code_workspace.file_store import node_relative_path, read_file_content
from app.services.code_workspace.project_store import get_project, parse_project_state
from sqlalchemy.orm import Session


async def review_code_workspace_file(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    *,
    file_id: str,
    user_request: str = "",
) -> dict:
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    node = find_file_node(state.nodes, file_id=file_id)
    file_path = node_relative_path(state.nodes, node.id)
    content = read_file_content(db, user_id, project_id, state.nodes, node.id)

    syntax = validate_source_syntax(
        content,
        language=node.language,
        file_path=file_path,
    )
    syntax_ok = bool(syntax.get("ok"))
    syntax_errors = list(syntax.get("errors") or [])

    summary = "Syntax check passed." if syntax_ok else "Syntax errors found."
    if syntax_errors:
        summary = "; ".join(str(item.get("message") or item) for item in syntax_errors[:3])

    return {
        "fileId": node.id,
        "filePath": file_path,
        "syntaxOk": syntax_ok,
        "passed": syntax_ok,
        "issues": syntax_errors,
        "summary": summary,
    }
