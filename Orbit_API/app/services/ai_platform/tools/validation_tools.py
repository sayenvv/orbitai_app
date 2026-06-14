"""Validation and dependency analysis helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.services.ai_platform.tools.command_tools import run_sandbox_command


async def analyze_dependencies(workspace_path: str) -> dict[str, Any]:
    root = Path(workspace_path)
    result: dict[str, Any] = {}
    pkg = root / "package.json"
    if pkg.exists():
        result["package_json"] = json.loads(pkg.read_text(encoding="utf-8"))
    req = root / "requirements.txt"
    if req.exists():
        result["requirements_txt"] = [
            line.strip()
            for line in req.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.startswith("#")
        ]
    pyproject = root / "pyproject.toml"
    if pyproject.exists():
        result["pyproject_exists"] = True
    return result


async def run_validation(workspace_path: str, build_command: str | None = None) -> dict[str, Any]:
    root = Path(workspace_path)
    commands: list[str] = []

    if (root / "package.json").exists():
        node_modules = root / "node_modules"
        if not node_modules.exists():
            commands.append("npm install --no-audit --no-fund")
        commands.append(build_command or "npm run build")
    elif (root / "requirements.txt").exists():
        commands.extend(
            [
                "python -m pip install -r requirements.txt",
                "python -m compileall .",
            ]
        )
    elif build_command:
        commands.append(build_command)

    logs: list[str] = []
    exit_code = 0
    for command in commands:
        result = await run_sandbox_command(workspace_path, command)
        logs.append(f"$ {command}\n{result['stdout']}\n{result['stderr']}".strip())
        exit_code = int(result["exit_code"])
        if exit_code != 0:
            break

    return {
        "status": "passed" if exit_code == 0 else "failed",
        "exit_code": exit_code,
        "log": "\n\n".join(logs)[-8000:],
        "commands": commands,
    }
