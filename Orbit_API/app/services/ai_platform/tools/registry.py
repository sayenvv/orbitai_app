"""Tool registry — maps admin tool names to executable handlers."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from app.services.ai_platform.tools.command_tools import run_sandbox_command
from app.services.ai_platform.tools.file_tools import (
    apply_patch,
    list_file_tree,
    read_workspace_file,
    write_workspace_files,
)
from app.services.ai_platform.tools.security_tools import scan_workspace_secrets
from app.services.ai_platform.tools.validation_tools import analyze_dependencies, run_validation
from app.services.ai_platform.tools.zip_tools import create_workspace_zip


class ToolRegistry:
    def __init__(self) -> None:
        self._handlers: dict[str, Callable[..., Any]] = {
            "file_writer": write_workspace_files,
            "file_reader": read_workspace_file,
            "file_tree": list_file_tree,
            "command_runner": run_sandbox_command,
            "patch_apply": apply_patch,
            "dependency_analyzer": analyze_dependencies,
            "code_search": self._code_search,
            "zip_tool": create_workspace_zip,
            "validation": run_validation,
            "security_scan": scan_workspace_secrets,
        }

    def execute(self, tool_name: str, **kwargs: Any) -> Any:
        handler = self._handlers.get(tool_name)
        if handler is None:
            raise ValueError(f"Unknown tool: {tool_name}")
        return handler(**kwargs)

    def has_tool(self, tool_name: str) -> bool:
        return tool_name in self._handlers

    @staticmethod
    def _code_search(workspace_path: str, query: str, *, max_results: int = 20) -> list[dict]:
        from pathlib import Path

        root = Path(workspace_path)
        results: list[dict] = []
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            if any(part in {".git", "node_modules", "__pycache__"} for part in path.parts):
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            if query.lower() in text.lower():
                rel = str(path.relative_to(root))
                line_no = next(
                    (idx for idx, line in enumerate(text.splitlines(), start=1) if query in line),
                    1,
                )
                results.append({"path": rel, "line": line_no})
            if len(results) >= max_results:
                break
        return results


tool_registry = ToolRegistry()
