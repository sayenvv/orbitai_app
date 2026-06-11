from __future__ import annotations

import json
import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from orbit_orchestration.config import get_orchestration_settings
from orbit_orchestration.langchain.llm_factory import create_chat_model

_JSON_FENCE = re.compile(r"```(?:json)?\s*\n([\s\S]*?)\n```", re.IGNORECASE)
_DEPENDENCY_MARKERS = (
    "modulenotfounderror",
    "no module named",
    "importerror",
    "cannot find module",
    "npm err!",
    "command not found: npm",
    "command not found: pnpm",
    "command not found: pip",
    "command not found: python",
    "please install",
    "not installed",
    "missing dependency",
    "requirements.txt",
    "package.json",
    "node_modules",
    "no such file or directory",
    "executable not found",
)

_RUN_PLAN_PROMPT = """You plan how to run a code project safely in a sandboxed IDE terminal.

Return JSON only:
{
  "summary": "One sentence overview of how to run this project",
  "steps": [
    {"command": "pip3 install -r requirements.txt", "purpose": "Install Python dependencies"},
    {"command": "python3 main.py", "purpose": "Start the application"}
  ]
}

Rules:
- Allowed command prefixes only: pip3 install, pip install, npm install, pnpm install, python3, python, node, npx, pnpm, npm, uvicorn
- uvicorn supports: `uvicorn app.main:app`, `uvicorn app.main:app --reload`, `python3 -m uvicorn app.main:app --reload`
- pip supports: `pip3 install -r requirements.txt`, `pip3 install --upgrade package`, `python3 -m pip install ...`
- Infer the ASGI target from project files (app/main.py → app.main:app). Do NOT guess orbit.main:app unless that file exists
- No shell chaining (; | & ` $)
- Inspect project files (requirements.txt, pyproject.toml, package.json, main.py, app/main.py) before planning
- For Python projects with requirements.txt or pyproject.toml, include a dependency install step BEFORE the run step
- For Node projects with package.json, include `npm install` or `pnpm install` before the start script when node_modules may be missing
- Prefer concrete paths from the file list (e.g. uvicorn app.main:app, python3 app/main.py)
- Keep 1-4 steps; install/fix steps first, run/start step last
- If the user only asked to install deps, omit the run step
"""

_FIX_PLAN_PROMPT = """A project command failed during execution. You are the Planner agent — create a recovery plan.

Return JSON only:
{
  "summary": "One sentence describing the fix strategy",
  "steps": [
    {"command": "pip3 install httpx", "purpose": "Install missing httpx package"},
    {"command": "python3 main.py", "purpose": "Retry the failed run step"}
  ],
  "done": false
}

Rules:
- Allowed commands: pip3 install ..., pip install --upgrade ..., npm install, pnpm install, python3 -m uvicorn app.main:app --reload, uvicorn app.main:app --reload
- If a command failed due to sandbox validation, rewrite it instead of retrying the exact same command
- Wrong module paths: prefer app.main:app when app/main.py exists in the project file list
- Do NOT retry `python3 -m uvicorn ... --reload` after it already failed — use `uvicorn app.main:app --reload` instead
- No shell chaining (; | & ` $)
- Create 1-4 steps: install/fix commands first, then retry the failed command as the last step when appropriate
- Prefer NEW commands not already listed in "Already tried commands"
- Set done to true ONLY when no allowed command can fix this (fix_command null and steps empty)
- Keep done false while recovery steps might still help
"""


def _parse_json(raw: str) -> dict[str, Any]:
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


def _file_paths(file_map: list[dict]) -> list[str]:
    return [
        str(item.get("filePath") or item.get("name") or "").strip()
        for item in file_map
        if item.get("filePath") or item.get("name")
    ]


def _heuristic_run_steps(file_paths: list[str], user_request: str) -> list[dict[str, str]]:
    lower_paths = {path.lower() for path in file_paths}
    steps: list[dict[str, str]] = []

    if "requirements.txt" in lower_paths:
        steps.append(
            {
                "command": "pip3 install -r requirements.txt",
                "purpose": "Install Python dependencies from requirements.txt",
            }
        )
    elif "pyproject.toml" in lower_paths:
        steps.append(
            {
                "command": "pip3 install -e .",
                "purpose": "Install Python project dependencies from pyproject.toml",
            }
        )

    if "package.json" in lower_paths:
        steps.append(
            {
                "command": "pnpm install" if "pnpm-lock.yaml" in lower_paths else "npm install",
                "purpose": "Install Node dependencies",
            }
        )

    if any("app/main.py" == p for p in lower_paths):
        steps.append({"command": "uvicorn app.main:app", "purpose": "Start FastAPI server"})
    elif any(p.endswith("main.py") for p in lower_paths):
        main_path = next(p for p in file_paths if p.endswith("main.py"))
        steps.append({"command": f"python3 {main_path}", "purpose": "Run main entry point"})
    elif "package.json" in lower_paths:
        steps.append({"command": "npm run dev", "purpose": "Start development server"})

    if not steps and "run" in user_request.lower():
        steps.append({"command": "python3 main.py", "purpose": "Run the project"})

    return steps


def infer_uvicorn_target(file_paths: list[str]) -> str | None:
    lower_paths = {path.lower() for path in file_paths}
    if "app/main.py" in lower_paths:
        return "app.main:app"
    return None


def normalize_terminal_command(command: str, file_paths: list[str]) -> str:
    """Rewrite common planner commands into sandbox-compatible forms."""
    cmd = " ".join(command.strip().split())
    target = infer_uvicorn_target(file_paths)
    if target and "orbit.main:app" in cmd:
        cmd = cmd.replace("orbit.main:app", target)

    module_uvicorn = re.match(r"python3?\s+-m\s+uvicorn\s+(.+)$", cmd, re.IGNORECASE)
    if module_uvicorn:
        cmd = f"uvicorn {module_uvicorn.group(1).strip()}"

    return cmd


def _heuristic_sandbox_recovery(
    failed_command: str,
    output: str,
    attempted: set[str],
    file_paths: list[str],
) -> list[dict[str, str]] | None:
    """Deterministic recovery for sandbox validation errors (no LLM needed)."""
    normalized = normalize_terminal_command(failed_command, file_paths)
    if normalized != failed_command and normalized not in attempted:
        return [
            {
                "command": normalized,
                "purpose": "Retry with sandbox-compatible command",
            }
        ]

    if "Unsupported uvicorn flag: --reload" in output and "--reload" in failed_command:
        stripped = re.sub(r"\s--reload\b", "", failed_command).strip()
        stripped = normalize_terminal_command(stripped, file_paths)
        if stripped and stripped not in attempted:
            return [{"command": stripped, "purpose": "Start server without reload flag issues"}]

    if infer_uvicorn_target(file_paths) and "uvicorn" in failed_command.lower():
        target = infer_uvicorn_target(file_paths)
        fixed = re.sub(
            r"[\w.]+\:app",
            target,
            failed_command,
            count=1,
        )
        fixed = normalize_terminal_command(fixed, file_paths)
        if fixed != failed_command and fixed not in attempted:
            return [{"command": fixed, "purpose": f"Use detected entrypoint {target}"}]

    return None


def server_started_successfully(output: str) -> bool:
    text = output or ""
    return "Server started successfully" in text or any(
        marker in text.lower() for marker in ("uvicorn running", "application startup complete")
    )


def looks_like_dependency_error(output: str) -> bool:
    text = (output or "").lower()
    return any(marker in text for marker in _DEPENDENCY_MARKERS)


def should_use_run_plan(
    *,
    user_request: str,
    terminal_command: str | None,
    request_type: str | None = None,
) -> bool:
    if terminal_command:
        return False

    normalized = user_request.strip().lower()
    if normalized in {"ls", "list", "list files", "files"} or normalized.startswith("find "):
        return False

    run_markers = (
        "run the project",
        "run project",
        "start the project",
        "start project",
        "run this",
        "execute the project",
        "launch the app",
        "start the app",
        "start server",
        "run app",
        "install dependencies",
        "install deps",
    )
    if any(marker in normalized for marker in run_markers):
        return True
    if "run" in normalized and "project" in normalized:
        return True
    return request_type == "terminal"


async def create_project_run_plan(
    *,
    user_request: str,
    file_map: list[dict],
    context_files: list[dict] | None = None,
    active_file_path: str | None = None,
    project_title: str = "Project",
) -> dict[str, Any]:
    """Build an ordered list of safe terminal commands to run the project."""
    file_paths = _file_paths(file_map)
    context_snippet = ""
    if context_files:
        for item in context_files[:6]:
            path = str(item.get("filePath") or item.get("path") or "")
            content = str(item.get("content") or "")[:1200]
            if path and content:
                context_snippet += f"\n\n--- {path} ---\n{content}"

    settings = get_orchestration_settings()
    llm = create_chat_model(settings)
    context_lines = [
        f"Project: {project_title}",
        f"User request:\n{user_request.strip()}",
        "Project files:\n" + ("\n".join(f"- {path}" for path in file_paths[:50]) or "(none)"),
    ]
    if active_file_path:
        context_lines.append(f"Active file: {active_file_path}")
    if context_snippet:
        context_lines.append(f"File excerpts:{context_snippet}")

    response = await llm.ainvoke(
        [SystemMessage(content=_RUN_PLAN_PROMPT), HumanMessage(content="\n\n".join(context_lines))]
    )
    raw = response.content
    parsed = _parse_json(raw if isinstance(raw, str) else str(raw or ""))

    steps: list[dict[str, str]] = []
    for item in parsed.get("steps") or []:
        if not isinstance(item, dict):
            continue
        command = str(item.get("command") or "").strip()
        if not command:
            continue
        steps.append(
            {
                "command": command,
                "purpose": str(item.get("purpose") or "Run step").strip(),
            }
        )

    if not steps:
        steps = _heuristic_run_steps(file_paths, user_request)

    summary = str(parsed.get("summary") or "").strip()
    if not summary and steps:
        summary = " → ".join(step["purpose"] for step in steps)

    return {"summary": summary, "steps": steps}


def _heuristic_fix_command(output: str, attempted: set[str]) -> str | None:
    """Fallback fix commands when the LLM has no new suggestion."""
    candidates: list[str] = []

    module_match = re.search(r"no module named ['\"]?([\w.]+)", output, re.IGNORECASE)
    if module_match:
        pkg = module_match.group(1).split(".")[0]
        candidates.extend([f"pip3 install {pkg}", f"pip install {pkg}"])

    if "npm err!" in output.lower() or "cannot find module" in output.lower():
        candidates.extend(["npm install", "pnpm install"])

    if "modulenotfounderror" in output.lower() or "importerror" in output.lower():
        candidates.append("pip3 install -r requirements.txt")

    for command in candidates:
        if command not in attempted:
            return command
    return None


def _parse_plan_steps(raw_steps: Any, attempted: set[str]) -> list[dict[str, str]]:
    steps: list[dict[str, str]] = []
    for item in raw_steps or []:
        if not isinstance(item, dict):
            continue
        command = str(item.get("command") or "").strip()
        if not command or command in attempted:
            continue
        steps.append(
            {
                "command": command,
                "purpose": str(item.get("purpose") or "Step").strip(),
            }
        )
    return steps


async def create_recovery_plan(
    *,
    user_request: str,
    failed_command: str,
    failed_purpose: str,
    output: str,
    exit_code: int | None,
    file_map: list[dict],
    executed_steps: list[dict[str, Any]],
    parent_plan_summary: str = "",
) -> dict[str, Any]:
    """Planner agent — build a multi-step recovery plan after an execution failure."""
    if exit_code in (0, None) and not looks_like_dependency_error(output):
        return {"summary": "No recovery needed.", "steps": [], "done": True}

    attempted = {
        str(step.get("command") or "").strip()
        for step in executed_steps
        if str(step.get("command") or "").strip()
    }
    file_paths = _file_paths(file_map)

    sandbox_steps = _heuristic_sandbox_recovery(
        failed_command, output, attempted, file_paths
    )
    if sandbox_steps:
        return {
            "summary": "Adjust command for sandbox compatibility",
            "steps": sandbox_steps,
            "done": False,
        }

    history = "\n".join(
        f"- [{step.get('planKind') or 'run'}] {step.get('command')}: "
        f"exit {step.get('exitCode')} — {(step.get('output') or '')[:180]}"
        for step in executed_steps[-10:]
    )
    settings = get_orchestration_settings()
    llm = create_chat_model(settings)
    prompt = "\n\n".join(
        [
            f"User request:\n{user_request.strip()}",
            f"Parent plan:\n{parent_plan_summary or '(run plan)'}",
            f"Failed step:\n{failed_purpose} — `{failed_command}`",
            f"Exit code: {exit_code}",
            f"Output:\n{(output or '')[:4000]}",
            "Project files:\n" + ("\n".join(f"- {path}" for path in file_paths[:40]) or "(none)"),
            f"Execution history:\n{history or '(none)'}",
            "Already tried commands:\n"
            + ("\n".join(f"- {cmd}" for cmd in sorted(attempted)[-24:]) or "(none)"),
        ]
    )
    response = await llm.ainvoke(
        [SystemMessage(content=_FIX_PLAN_PROMPT), HumanMessage(content=prompt)]
    )
    raw = response.content
    parsed = _parse_json(raw if isinstance(raw, str) else str(raw or ""))

    done = bool(parsed.get("done"))
    steps = _parse_plan_steps(parsed.get("steps"), attempted)

    if not steps and not done:
        heuristic = _heuristic_fix_command(output, attempted)
        if heuristic:
            steps = [
                {"command": heuristic, "purpose": "Install missing dependency"},
                {"command": failed_command, "purpose": f"Retry: {failed_purpose}"},
            ]

    if not steps:
        done = True

    summary = str(parsed.get("summary") or parsed.get("analysis") or "Recovery plan").strip()
    return {"summary": summary, "steps": steps, "done": done}


async def plan_fix_for_failure(
    *,
    user_request: str,
    failed_command: str,
    output: str,
    exit_code: int | None,
    file_map: list[dict],
    executed_steps: list[dict[str, Any]],
) -> dict[str, Any]:
    """Legacy single-command fix helper — delegates to create_recovery_plan."""
    recovery = await create_recovery_plan(
        user_request=user_request,
        failed_command=failed_command,
        failed_purpose="Failed step",
        output=output,
        exit_code=exit_code,
        file_map=file_map,
        executed_steps=executed_steps,
    )
    steps = recovery.get("steps") or []
    fix_command = steps[0]["command"] if steps else None
    return {
        "analysis": recovery.get("summary") or "Analyzing failure…",
        "fix_command": fix_command,
        "done": recovery.get("done", False),
    }
