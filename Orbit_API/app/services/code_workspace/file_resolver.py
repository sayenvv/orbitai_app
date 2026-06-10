from __future__ import annotations

from fastapi import HTTPException, status

from app.services.code_workspace.file_store import node_relative_path
from clovai_apps.code_workspace.schemas import CodeWorkspaceNode


def normalize_project_path(path: str) -> str:
    return path.strip().lstrip("/").replace("\\", "/")


def find_file_node(
    nodes: list[CodeWorkspaceNode],
    *,
    file_id: str | None = None,
    file_path: str | None = None,
) -> CodeWorkspaceNode:
    if file_id:
        node = next((item for item in nodes if item.id == file_id), None)
        if node is None or node.kind != "file":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
        return node

    if file_path:
        normalized = normalize_project_path(file_path)
        for node in nodes:
            if node.kind != "file":
                continue
            if node_relative_path(nodes, node.id) == normalized:
                return node
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Provide file_id or file_path.",
    )


def slice_file_lines(content: str, *, start_line: int = 1, end_line: int = 0) -> tuple[str, int, int]:
    lines = content.splitlines()
    total = len(lines)
    if total == 0:
        return content, 1, 1

    start = max(1, start_line)
    end = end_line if end_line > 0 else total
    end = min(end, total)
    if start > end:
        start = end

    sliced = "\n".join(lines[start - 1 : end])
    return sliced, start, end
