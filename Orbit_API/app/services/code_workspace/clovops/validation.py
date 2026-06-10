from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.services.code_workspace.code_review import validate_source_syntax
from app.services.code_workspace.file_resolver import find_file_node
from app.services.code_workspace.file_store import node_relative_path, read_file_content
from app.services.code_workspace.project_store import get_project, parse_project_state


def validate_edited_files(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    file_ids: list[str],
) -> dict:
    """Test / validation agent — syntax checks on edited files (lint/build stubs later)."""
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)

    issues: list[dict] = []
    for file_id in file_ids:
        try:
            node = find_file_node(state.nodes, file_id=file_id)
            content = read_file_content(db, user_id, project_id, state.nodes, node.id)
            file_path = node_relative_path(state.nodes, node.id)
            result = validate_source_syntax(content, language=node.language, file_path=file_path)
            for issue in result.get("errors") or []:
                issues.append({**issue, "fileId": file_id, "filePath": file_path})
        except Exception as exc:
            issues.append(
                {
                    "fileId": file_id,
                    "filePath": file_id,
                    "line": 1,
                    "severity": "error",
                    "message": str(exc),
                }
            )

    return {
        "passed": len(issues) == 0,
        "issues": issues,
        "checks": ["syntax"],
    }
