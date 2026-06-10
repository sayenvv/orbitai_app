from __future__ import annotations

import json
import uuid
from contextlib import contextmanager
from typing import Any, Iterator

from langchain_core.tools import StructuredTool
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.code_workspace.code_review import validate_source_syntax
from app.services.code_workspace.file_resolver import (
    find_file_node,
    find_folder_id_by_path,
    infer_language_from_name,
    slice_file_lines,
)
from app.services.code_workspace.file_store import node_relative_path, read_file_content, write_file_content
from app.services.code_workspace.project_store import add_project_node, get_project, parse_project_state
from clovai_apps.code_workspace.schemas import CodeWorkspaceNodeCreateRequest
from app.services.code_workspace.search_store import search_project_files
from clovai_apps.code_workspace.schemas import CodeWorkspaceSearchRequest


@contextmanager
def _tool_db_session() -> Iterator[Session]:
    """Short-lived session for agent tool calls (safe across SSE + thread pool)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def search_code_workspace_files_for_agent(
    db: Session,
    user_id: uuid.UUID,
    *,
    project_id: str,
    query: str,
    mode: str = "all",
    case_sensitive: bool = False,
    max_results: int = 25,
) -> dict[str, Any]:
    """Agent-callable wrapper around the code workspace search tool."""
    body = CodeWorkspaceSearchRequest(
        query=query,
        mode=mode,  # type: ignore[arg-type]
        case_sensitive=case_sensitive,
        max_results=max_results,
    )
    result = search_project_files(db, user_id, uuid.UUID(project_id), body)
    return result.model_dump(by_alias=True)


def read_code_workspace_file_for_agent(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    *,
    file_id: str | None = None,
    file_path: str | None = None,
    start_line: int = 1,
    end_line: int = 0,
    max_chars: int = 12000,
) -> dict[str, Any]:
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    node = find_file_node(state.nodes, file_id=file_id, file_path=file_path)
    content = read_file_content(db, user_id, project_id, state.nodes, node.id)
    sliced, range_start, range_end = slice_file_lines(content, start_line=start_line, end_line=end_line)
    if len(sliced) > max_chars:
        sliced = sliced[:max_chars] + "\n… (truncated)"
    return {
        "fileId": node.id,
        "filePath": node_relative_path(state.nodes, node.id),
        "language": node.language,
        "startLine": range_start,
        "endLine": range_end,
        "totalLines": len(content.splitlines()) or 1,
        "content": sliced,
    }


def create_code_workspace_file_for_agent(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    *,
    name: str,
    content: str,
    parent_id: str | None = None,
    parent_path: str | None = None,
    language: str | None = None,
) -> dict[str, Any]:
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    resolved_parent = parent_id
    if not resolved_parent and parent_path:
        resolved_parent = find_folder_id_by_path(state.nodes, parent_path)

    file_language = language or infer_language_from_name(name)
    add_project_node(
        db,
        user_id,
        project_id,
        CodeWorkspaceNodeCreateRequest(
            kind="file",
            name=name.strip(),
            parent_id=resolved_parent,
            language=file_language,
        ),
    )

    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    file_id = state.ui.active_file_id
    if not file_id:
        raise ValueError("Failed to resolve created file id.")

    write_file_content(db, user_id, project_id, state.nodes, file_id, content)
    file_path = node_relative_path(state.nodes, file_id)
    syntax = validate_source_syntax(content, language=file_language, file_path=file_path)
    return {
        "fileId": file_id,
        "filePath": file_path,
        "status": "created",
        "created": True,
        "bytes": len(content.encode("utf-8")),
        "syntaxOk": bool(syntax.get("ok")),
        "syntaxErrors": syntax.get("errors") or [],
    }


def write_code_workspace_file_for_agent(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    *,
    file_id: str,
    content: str,
) -> dict[str, Any]:
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    node = find_file_node(state.nodes, file_id=file_id)
    write_file_content(db, user_id, project_id, state.nodes, node.id, content)
    file_path = node_relative_path(state.nodes, node.id)
    syntax = validate_source_syntax(content, language=node.language, file_path=file_path)
    return {
        "fileId": node.id,
        "filePath": file_path,
        "status": "saved",
        "created": False,
        "bytes": len(content.encode("utf-8")),
        "syntaxOk": bool(syntax.get("ok")),
        "syntaxErrors": syntax.get("errors") or [],
    }


def build_code_workspace_agent_tools(
    user_id: uuid.UUID,
    project_id: str,
) -> list[StructuredTool]:
    """LangGraph tools for the Clovops editor agent."""

    def search_code_workspace_files(
        query: str,
        mode: str = "all",
        max_results: int = 25,
    ) -> str:
        """Search project files by filename, path, or file content."""
        with _tool_db_session() as db:
            payload = search_code_workspace_files_for_agent(
                db,
                user_id,
                project_id=project_id,
                query=query,
                mode=mode,
                max_results=min(max(max_results, 1), 50),
            )
        return json.dumps(payload)

    def read_code_workspace_file(
        file_id: str = "",
        file_path: str = "",
        start_line: int = 1,
        end_line: int = 0,
        max_chars: int = 12000,
    ) -> str:
        """Read file source for LLM context. Provide file_id or file_path."""
        with _tool_db_session() as db:
            payload = read_code_workspace_file_for_agent(
                db,
                user_id,
                uuid.UUID(project_id),
                file_id=file_id or None,
                file_path=file_path or None,
                start_line=start_line,
                end_line=end_line,
                max_chars=max_chars,
            )
        return json.dumps(payload)

    def write_code_workspace_file(file_id: str, content: str) -> str:
        """Replace a file's full contents with updated source code."""
        with _tool_db_session() as db:
            payload = write_code_workspace_file_for_agent(
                db,
                user_id,
                uuid.UUID(project_id),
                file_id=file_id,
                content=content,
            )
        return json.dumps(payload)

    def create_code_workspace_file(
        name: str,
        content: str,
        parent_path: str = "",
        parent_id: str = "",
        language: str = "",
    ) -> str:
        """Create a new file in the project and write its full contents."""
        with _tool_db_session() as db:
            payload = create_code_workspace_file_for_agent(
                db,
                user_id,
                uuid.UUID(project_id),
                name=name,
                content=content,
                parent_id=parent_id or None,
                parent_path=parent_path or None,
                language=language or None,
            )
        return json.dumps(payload)

    return [
        StructuredTool.from_function(
            func=search_code_workspace_files,
            name="search_code_workspace_files",
            description="Find relevant files by keyword, symbol, path, or content.",
        ),
        StructuredTool.from_function(
            func=read_code_workspace_file,
            name="read_code_workspace_file",
            description=(
                "Read file source before editing. Use file_id from search results "
                "or file_path like src/client.ts. Optional start_line/end_line for a range."
            ),
        ),
        StructuredTool.from_function(
            func=write_code_workspace_file,
            name="write_code_workspace_file",
            description=(
                "Save the full updated file content after reading and editing. "
                "Always read the file first unless you already have the full current content."
            ),
        ),
        StructuredTool.from_function(
            func=create_code_workspace_file,
            name="create_code_workspace_file",
            description="Create a new project file with full content. Use parent_path like src or lib.",
        ),
    ]
