from __future__ import annotations

import json
import re
import shlex
import subprocess
import uuid
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.code_workspace.clovops.indexing import build_project_file_map
from app.services.code_workspace.file_store import ensure_project_directory, sync_structure_to_disk
from app.services.code_workspace.project_store import get_project, parse_project_state
from orbit_orchestration.config import get_orchestration_settings
from orbit_orchestration.langchain.llm_factory import create_chat_model

_ALLOWED_BINARIES = frozenset({"python", "python3", "node", "npm", "pnpm", "npx", "uvicorn"})
_BLOCKED_SHELL_TOKENS = re.compile(r"[;&|`$<>]")
_UVICORN_MODULE_RE = re.compile(r"^[\w.]+:[\w]+$")
_JSON_FENCE = re.compile(r"```(?:json)?\s*\n([\s\S]*?)\n```", re.IGNORECASE)
_SERVER_START_MARKERS = ("uvicorn running", "application startup complete", "started server process")
_PREVIEW_PORT = "18765"
_SERVER_PREVIEW_SECONDS = 12

_TERMINAL_RESOLVER_PROMPT = """You resolve natural-language terminal requests into a single safe shell command for a code project.

Return JSON only:
{"command": "python3 main.py"}

Rules:
- Allowed binaries only: python, python3, node, npm, pnpm, npx, uvicorn
- No shell chaining (; | & ` $)
- Use project file paths from the list when inferring scripts
- For FastAPI/web servers prefer uvicorn with module:app (e.g. uvicorn app.main:app)
- Return {"command": null} if you cannot determine a safe command
"""


def _parse_terminal_json(raw: str) -> dict:
    text = raw.strip()
    match = _JSON_FENCE.search(text)
    if match:
        text = match.group(1).strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    return {}


def _parse_direct_command(command: str) -> tuple[str, list[str]] | None:
    text = command.strip()
    if not text or _BLOCKED_SHELL_TOKENS.search(text):
        return None
    try:
        argv = shlex.split(text)
    except ValueError:
        return None
    if not argv:
        return None
    binary = argv[0].lower()
    if binary not in _ALLOWED_BINARIES:
        return None
    if binary == "uvicorn":
        return "uvicorn", argv[1:]
    return binary, argv[1:]


async def infer_terminal_command(
    *,
    user_request: str,
    file_map: list[dict],
    active_file_path: str | None = None,
    project_title: str = "Project",
) -> str:
    """LLM fallback when the gateway did not provide an explicit terminal command."""
    direct = _parse_direct_command(user_request)
    if direct is not None:
        binary, args = direct
        return " ".join([binary, *args])

    file_lines = "\n".join(
        f"- {item.get('filePath', item.get('name', ''))}"
        for item in file_map[:40]
    ) or "(no files)"

    context = [f"Project: {project_title}"]
    if active_file_path:
        context.append(f"Active file: {active_file_path}")
    context.append(f"Project files:\n{file_lines}")
    context.append(f"User request:\n{user_request.strip()}")

    settings = get_orchestration_settings()
    llm = create_chat_model(settings)
    response = await llm.ainvoke(
        [
            SystemMessage(content=_TERMINAL_RESOLVER_PROMPT),
            HumanMessage(content="\n\n".join(context)),
        ]
    )
    raw = response.content
    plan_text = raw if isinstance(raw, str) else str(raw or "")
    parsed = _parse_terminal_json(plan_text)
    command = parsed.get("command")
    if command is None:
        return ""
    return str(command).strip()


def _validate_argv(binary: str, args: list[str], project_root: Path) -> list[str]:
    if binary not in _ALLOWED_BINARIES:
        raise ValueError(f"Command '{binary}' is not allowed.")

    if binary == "uvicorn":
        if not args:
            raise ValueError("uvicorn requires a module target like `app.main:app`.")
        module_target = args[0]
        if not _UVICORN_MODULE_RE.match(module_target):
            raise ValueError("uvicorn target must look like `package.module:app`.")

        allowed_flags = {"--host", "--port"}
        argv = ["uvicorn", module_target]
        index = 1
        while index < len(args):
            token = args[index]
            if token not in allowed_flags:
                raise ValueError(f"Unsupported uvicorn flag: {token}")
            if index + 1 >= len(args):
                raise ValueError(f"Missing value for {token}.")
            value = args[index + 1]
            if _BLOCKED_SHELL_TOKENS.search(value):
                raise ValueError("Shell operators are not allowed.")
            if token == "--host" and value not in {"127.0.0.1", "localhost"}:
                raise ValueError("uvicorn may only bind to localhost.")
            if token == "--port" and not value.isdigit():
                raise ValueError("uvicorn --port must be numeric.")
            argv.extend([token, value])
            index += 2

        if "--host" not in argv:
            argv.extend(["--host", "127.0.0.1"])
        if "--port" not in argv:
            argv.extend(["--port", _PREVIEW_PORT])
        return argv

    argv = [binary, *args]
    for token in argv:
        if _BLOCKED_SHELL_TOKENS.search(token):
            raise ValueError("Shell operators are not allowed.")

    script = args[0] if args else ""
    if script:
        candidate = (project_root / script).resolve()
        root = project_root.resolve()
        if candidate != root and root not in candidate.parents:
            raise ValueError("Script path must stay inside the project.")
        if not candidate.exists():
            raise ValueError(f"File not found in project: {script}")

    return argv


def _format_output(stdout: str, stderr: str) -> str:
    output_parts = []
    if stdout.strip():
        output_parts.append(stdout.strip())
    if stderr.strip():
        output_parts.append(stderr.strip())
    return "\n".join(output_parts) if output_parts else "(no output)"


def _execute_in_project(project_root: Path, argv: list[str], *, timeout: int = 45) -> dict:
    try:
        completed = subprocess.run(
            argv,
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
        return {
            "command": " ".join(argv),
            "output": _format_output(completed.stdout or "", completed.stderr or ""),
            "exitCode": completed.returncode,
            "executed": True,
            "safe": True,
        }
    except subprocess.TimeoutExpired as exc:
        output = _format_output(
            exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or ""),
            exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or ""),
        )
        if any(marker in output.lower() for marker in _SERVER_START_MARKERS):
            output = (
                f"{output}\n\n"
                f"Server started successfully on http://127.0.0.1:{_PREVIEW_PORT} "
                f"(preview stopped after {timeout}s)."
            )
            return {
                "command": " ".join(argv),
                "output": output,
                "exitCode": 0,
                "executed": True,
                "safe": True,
            }
        return {
            "command": " ".join(argv),
            "output": output or f"Command timed out after {timeout}s.",
            "exitCode": 124,
            "executed": False,
            "safe": True,
        }
    except FileNotFoundError:
        return {
            "command": " ".join(argv),
            "output": f"Executable not found: {argv[0]}. Install it on the server or use another runtime.",
            "exitCode": 127,
            "executed": False,
            "safe": True,
        }


def run_safe_terminal_command(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    *,
    command: str,
    active_file_path: str | None = None,
) -> dict:
    """Terminal agent — list/find plus sandboxed run for python/node/fastapi in the project directory."""
    normalized = command.strip().lower()
    file_map = build_project_file_map(db, user_id, project_id)

    if normalized in {"ls", "list", "list files", "files"}:
        paths = [item["filePath"] for item in file_map]
        return {
            "command": command,
            "output": "\n".join(paths) if paths else "(no files)",
            "exitCode": 0,
            "executed": False,
            "safe": True,
        }

    if normalized.startswith("find "):
        query = command.strip()[5:]
        matches = [
            item["filePath"] for item in file_map if query.lower() in item["filePath"].lower()
        ]
        return {
            "command": command,
            "output": "\n".join(matches) if matches else f"No files matching '{query}'",
            "exitCode": 0,
            "executed": False,
            "safe": True,
        }

    if not settings.code_workspace_persistence_enabled:
        return {
            "command": command,
            "output": "Terminal execution requires a saved project with server-side persistence enabled.",
            "exitCode": 1,
            "executed": False,
            "safe": False,
        }

    try:
        row = get_project(db, user_id, project_id)
        state = parse_project_state(row.state)
        sync_structure_to_disk(db, user_id, project_id, state.nodes)
        project_root = ensure_project_directory(db, user_id, project_id)

        run_target = _parse_direct_command(command)
        if run_target is None:
            return {
                "command": command,
                "output": (
                    "Could not run that command. Provide an explicit command such as "
                    "`python3 main.py`, `uvicorn app.main:app`, or `list files`."
                ),
                "exitCode": 1,
                "executed": False,
                "safe": False,
            }

        binary, args = run_target
        argv = _validate_argv(binary, args, project_root)
        timeout = _SERVER_PREVIEW_SECONDS if binary == "uvicorn" else 45
        return _execute_in_project(project_root, argv, timeout=timeout)
    except ValueError as exc:
        return {
            "command": command,
            "output": str(exc),
            "exitCode": 1,
            "executed": False,
            "safe": False,
        }
    except Exception as exc:
        return {
            "command": command,
            "output": f"Terminal execution failed: {exc}",
            "exitCode": 1,
            "executed": False,
            "safe": False,
        }
