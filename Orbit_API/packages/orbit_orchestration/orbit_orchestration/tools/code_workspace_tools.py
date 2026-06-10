from __future__ import annotations

import json

from langchain_core.tools import tool


@tool
def search_code_workspace_files(
    project_id: str,
    query: str,
    mode: str = "all",
    case_sensitive: bool = False,
    max_results: int = 25,
) -> str:
    """Search files in a Clovops code workspace project by filename, path, or content.

    Returns JSON matches with fileId, filePath, line, column, and kind (filename|content).
    Use fileId with GET /api/apps/code-workspace/projects/{project_id}/files/{node_id}
    to read file content before editing.
    """
    return json.dumps(
        {
            "tool": "search_code_workspace_files",
            "api": f"POST /api/apps/code-workspace/projects/{project_id}/search",
            "parameters": {
                "project_id": project_id,
                "query": query,
                "mode": mode,
                "case_sensitive": case_sensitive,
                "max_results": max_results,
            },
            "note": "Invoke the authenticated code-workspace search API from the app layer.",
        },
        indent=2,
    )
