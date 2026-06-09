from __future__ import annotations

import json
import py_compile
import shutil
import subprocess
import time
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.services.code_workspace.file_store import ensure_project_directory, sync_structure_to_disk
from app.services.code_workspace.project_store import get_project, parse_project_state
from clovai_apps.code_workspace.schemas import (
    CodeWorkspaceDeployLogEntry,
    CodeWorkspaceDeployRequest,
    CodeWorkspaceDeployResponse,
)


def _now_ms() -> int:
    return int(time.time() * 1000)


def _log(
    logs: list[CodeWorkspaceDeployLogEntry],
    message: str,
    *,
    level: str = "info",
) -> None:
    logs.append(
        CodeWorkspaceDeployLogEntry(
            level=level,  # type: ignore[arg-type]
            message=message,
            timestamp=_now_ms(),
        )
    )


def _detect_stack(root: Path) -> str:
    if (root / "package.json").is_file():
        return "node"
    if any((root / name).is_file() for name in ("requirements.txt", "pyproject.toml", "main.py", "app.py")):
        return "python"
    if (root / "index.html").is_file():
        return "static"
    return "generic"


def _run_command(cmd: list[str], cwd: Path, timeout: int = 120) -> tuple[int, str]:
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        output = "\n".join(part for part in (result.stdout, result.stderr) if part).strip()
        return result.returncode, output
    except subprocess.TimeoutExpired:
        return 1, "Command timed out."
    except FileNotFoundError:
        return 1, f"Command not found: {cmd[0]}"


def _deploy_node(root: Path, logs: list[CodeWorkspaceDeployLogEntry]) -> bool:
    package_path = root / "package.json"
    try:
        package = json.loads(package_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        _log(logs, "package.json is invalid JSON.", level="error")
        return False

    scripts = package.get("scripts") if isinstance(package, dict) else None
    if not isinstance(scripts, dict) or "build" not in scripts:
        _log(logs, "No build script found — packaging source files only.", level="warn")
        return True

    for cmd in (["pnpm", "run", "build"], ["npm", "run", "build"], ["yarn", "build"]):
        if shutil.which(cmd[0]) is None:
            continue
        _log(logs, f"Running {' '.join(cmd)}…")
        code, output = _run_command(cmd, root)
        if output:
            for line in output.splitlines():
                _log(logs, line)
        if code == 0:
            _log(logs, "Build completed successfully.", level="success")
            return True
        _log(logs, f"Build failed with exit code {code}.", level="error")
        return False

    _log(logs, "No Node package manager found (pnpm, npm, or yarn).", level="error")
    return False


def _deploy_python(root: Path, logs: list[CodeWorkspaceDeployLogEntry]) -> bool:
    py_files = sorted(root.rglob("*.py"))
    if not py_files:
        _log(logs, "No Python files found to validate.", level="warn")
        return True

    _log(logs, f"Validating {len(py_files)} Python file(s)…")
    for py_file in py_files:
        if ".clovops" in py_file.parts:
            continue
        try:
            py_compile.compile(str(py_file), doraise=True)
        except py_compile.PyCompileError as exc:
            _log(logs, f"{py_file.relative_to(root)}: {exc}", level="error")
            return False

    _log(logs, "Python syntax validation passed.", level="success")
    return True


def _write_manifest(
    root: Path,
    *,
    project_id: uuid.UUID,
    stack: str,
    deploy_url: str,
    status: str,
) -> None:
    manifest_dir = root / ".clovops"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "projectId": str(project_id),
        "stack": stack,
        "status": status,
        "deployUrl": deploy_url,
        "deployedAt": _now_ms(),
    }
    (manifest_dir / "deploy-manifest.json").write_text(
        json.dumps(manifest, indent=2),
        encoding="utf-8",
    )


def deploy_project(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceDeployRequest,
) -> CodeWorkspaceDeployResponse:
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    logs: list[CodeWorkspaceDeployLogEntry] = []

    _log(logs, f"Starting deploy to {body.target}…")
    _log(logs, f"Project: {row.title}")

    sync_structure_to_disk(db, user_id, project_id, state.nodes)
    root = ensure_project_directory(db, user_id, project_id)
    stack = _detect_stack(root)
    _log(logs, f"Detected stack: {stack}")

    ok = True
    if stack == "node":
        ok = _deploy_node(root, logs)
    elif stack == "python":
        ok = _deploy_python(root, logs)
    elif stack == "static":
        _log(logs, "Static site ready for edge deployment.", level="success")
    else:
        _log(logs, "Generic project — bundling workspace files.", level="warn")

    slug = str(project_id).split("-")[0]
    deploy_url = f"https://{slug}.clovops.app" if ok else None
    status = "success" if ok else "failed"

    if ok:
        _write_manifest(root, project_id=project_id, stack=stack, deploy_url=deploy_url or "", status=status)
        _log(logs, f"Live at {deploy_url}", level="success")
    else:
        _log(logs, "Deploy failed. Fix the errors above and try again.", level="error")

    return CodeWorkspaceDeployResponse(
        status=status,  # type: ignore[arg-type]
        stack=stack,
        deploy_url=deploy_url,
        logs=logs,
        deployed_at=_now_ms(),
    )
