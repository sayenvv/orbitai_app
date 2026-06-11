from __future__ import annotations

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from typing import Any

_HEARTBEAT_SECONDS = 8

from app.services.code_workspace.clovops.maf.runner import (
    _stream_clovops_maf_events,
    stream_clovops_maf_resume,
)
from app.services.code_workspace.clovops.types import ClovopsGraphState
from clovai_apps.code_workspace.schemas import CodeWorkspaceAgentSearchRequest

_PHASE_LABELS: dict[str, str] = {
    "gateway": "Understanding request…",
    "index_project": "Indexing project files…",
    "search_files": "Searching relevant files…",
    "build_context": "Reading file context…",
    "plan_changes": "Planning changes…",
    "write_code": "Writing code…",
    "review_code": "Reviewing changes…",
    "validate_code": "Validating code…",
    "chat_response": "Replying…",
    "explain_response": "Preparing answer…",
    "terminal": "Running project steps…",
}

_AGENT_LABELS: dict[str, str] = {
    "gateway": "Gateway",
    "index_project": "Project Indexer",
    "search_files": "Search Agent",
    "build_context": "Context Builder",
    "plan_changes": "Planner",
    "write_code": "Code Writer",
    "review_code": "Code Reviewer",
    "validate_code": "Validator",
    "chat_response": "Assistant",
    "explain_response": "Assistant",
    "terminal": "Terminal Agent",
}

_REQUEST_TYPE_LABELS: dict[str, str] = {
    "code_question": "Code question",
    "code_edit": "Code edit",
    "bug_fix": "Bug fix",
    "chat": "Chat",
    "explain": "Explain",
    "summarize": "Summarize",
    "terminal": "Terminal",
}


def _active_log_id(agent_id: str) -> str:
    return f"{agent_id}-active"


def _log_event(
    *,
    agent_id: str,
    status: str,
    message: str,
    detail: str | None = None,
    log_id: str | None = None,
) -> dict[str, Any]:
    return {
        "type": "log",
        "id": log_id or str(uuid.uuid4()),
        "agent": _AGENT_LABELS.get(agent_id, agent_id),
        "agentId": agent_id,
        "status": status,
        "message": message,
        "detail": detail,
    }


def _format_paths(items: list[dict[str, Any]], *, key: str = "filePath", limit: int = 4) -> str:
    paths: list[str] = []
    for item in items:
        path = str(item.get(key) or item.get("path") or "").strip()
        if path and path not in paths:
            paths.append(path)
        if len(paths) >= limit:
            break
    if not paths:
        return ""
    suffix = ""
    total = len(items)
    if total > limit:
        suffix = f" (+{total - limit} more)"
    return ", ".join(paths) + suffix


def _build_log_detail(node_name: str, node_state: dict[str, Any]) -> str | None:
    if node_name == "gateway":
        request_type = node_state.get("request_type") or "unknown"
        label = _REQUEST_TYPE_LABELS.get(request_type, request_type)
        reason = (node_state.get("routing_reason") or "").strip()
        pipeline = node_state.get("pipeline") or []
        pipeline_text = " → ".join(pipeline) if pipeline else "none"
        return f"Routed as {label}. Pipeline: {pipeline_text}. {reason}".strip()

    if node_name == "index_project":
        count = len(node_state.get("file_map") or [])
        return f"Indexed {count} file{'s' if count != 1 else ''} in the project tree."

    if node_name == "search_files":
        results = node_state.get("search_results") or []
        if not results:
            return "No direct matches — used filename/path fallback search."
        paths = _format_paths(results)
        return f"Found {len(results)} match{'es' if len(results) != 1 else ''}: {paths}"

    if node_name == "build_context":
        files = node_state.get("context_files") or []
        if not files:
            return "No files loaded into context."
        paths = _format_paths(files)
        return f"Loaded {len(files)} file{'s' if len(files) != 1 else ''}: {paths}"

    if node_name == "plan_changes":
        updates = node_state.get("plan_updates") or []
        creates = node_state.get("plan_creates") or []
        parts: list[str] = []
        if updates:
            paths = _format_paths(updates)
            parts.append(f"update {len(updates)} ({paths})")
        if creates:
            paths = _format_paths(creates, key="path")
            parts.append(f"create {len(creates)} ({paths})")
        plan = (node_state.get("plan") or "").strip()
        summary = "; ".join(parts) if parts else "read-only response"
        if plan:
            first_line = plan.splitlines()[0].strip()
            if len(first_line) > 120:
                first_line = first_line[:117] + "..."
            return f"Plan: {summary}. {first_line}"
        return f"Plan: {summary}."

    if node_name == "write_code":
        edits = node_state.get("last_edits") or []
        if not edits:
            return "No files were written."
        parts: list[str] = []
        for edit in edits:
            path = str(edit.get("filePath") or "unknown")
            if edit.get("created"):
                parts.append(f"created {path}")
            else:
                parts.append(f"updated {path}")
        return "; ".join(parts)

    if node_name == "review_code":
        reviews = node_state.get("reviews") or []
        if not reviews:
            return "No edits to review."
        passed = sum(1 for review in reviews if review.get("passed"))
        failed = len(reviews) - passed
        paths = _format_paths(reviews)
        if failed:
            return f"Reviewed {len(reviews)} file{'s' if len(reviews) != 1 else ''} ({paths}) — {failed} need fixes."
        return f"Reviewed {len(reviews)} file{'s' if len(reviews) != 1 else ''} ({paths}) — all passed."

    if node_name == "validate_code":
        validation = node_state.get("validation") or {}
        issues = validation.get("issues") or []
        checks = validation.get("checks") or []
        if validation.get("passed"):
            check_text = ", ".join(checks) if checks else "syntax checks"
            return f"Validation passed ({check_text})."
        return f"Validation failed with {len(issues)} issue{'s' if len(issues) != 1 else ''}."

    if node_name == "chat_response":
        return "Sent a direct reply — skipped project indexing and search."

    if node_name == "explain_response":
        return "Generated explanation from project context."

    if node_name == "terminal":
        result = node_state.get("terminal_result") or {}
        steps = result.get("steps") or []
        if steps:
            ok = sum(1 for step in steps if step.get("exitCode") in (0, None))
            failed = len(steps) - ok
            preview = result.get("plan_summary") or "Executed run plan"
            if failed:
                return f"{preview} — {ok}/{len(steps)} steps succeeded."
            return f"{preview} — all {len(steps)} steps completed."
        command = (result.get("command") or "").strip()
        output = (result.get("output") or "").strip()
        if command:
            preview = output.splitlines()[0][:100] if output else "No output"
            return f"Ran `{command}` — {preview}"
        return output[:160] if output else "Command completed."

    return None


def _build_initial_state(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceAgentSearchRequest,
    *,
    project_title: str,
) -> ClovopsGraphState:
    return {
        "user_id": str(user_id),
        "project_id": str(project_id),
        "project_title": project_title,
        "user_request": body.message.strip(),
        "active_file_id": body.active_file_id,
        "active_file_path": body.active_file_path,
        "history": [(turn.role, turn.content) for turn in body.history],
        "edits": [],
        "reviews": [],
        "retry_count": 0,
    }


async def _with_heartbeats(
    event_source: AsyncIterator[dict[str, Any]],
) -> AsyncIterator[dict[str, Any]]:
    """Emit keepalive pings during long gaps between agent steps."""
    queue: asyncio.Queue[tuple[str, Any]] = asyncio.Queue()
    done = asyncio.Event()

    async def producer() -> None:
        try:
            async for event in event_source:
                await queue.put(("event", event))
        except Exception as exc:
            await queue.put(("error", exc))
        finally:
            done.set()
            await queue.put(("end", None))

    task = asyncio.create_task(producer())
    try:
        while True:
            try:
                kind, payload = await asyncio.wait_for(
                    queue.get(),
                    timeout=_HEARTBEAT_SECONDS,
                )
            except asyncio.TimeoutError:
                if done.is_set() and queue.empty():
                    break
                yield {"type": "ping"}
                continue

            if kind == "end":
                break
            if kind == "error":
                raise payload
            yield payload
    finally:
        if not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task


def _running_log_message(agent_id: str, custom_message: str | None = None) -> str:
    if custom_message:
        return custom_message
    return _PHASE_LABELS.get(agent_id, agent_id)


def _effective_agent_id(node_name: str, node_state: dict[str, Any]) -> str:
    if node_name == "pipeline_runner":
        step = str(node_state.get("last_pipeline_step") or "").strip()
        if step:
            return step
    return node_name


async def _emit_node_completion(
    node_name: str,
    node_state: dict[str, Any],
    *,
    final_state: dict[str, Any],
    running_log_ids: dict[str, str],
    emitted_edit_ids: set[str],
    streamed_writer_text: bool,
) -> AsyncIterator[dict[str, Any]]:
    from app.services.code_workspace.clovops.workflow_events import workflow_event

    agent_id = _effective_agent_id(node_name, node_state)
    detail = _build_log_detail(agent_id, {**final_state, **node_state})
    done_log_id = running_log_ids.pop(agent_id, None) or _active_log_id(agent_id)
    yield _log_event(
        agent_id=agent_id,
        status="done",
        message=_PHASE_LABELS.get(agent_id, agent_id),
        detail=detail,
        log_id=done_log_id,
    )

    yield {
        "type": "phase",
        "phase": agent_id,
        "status": "done",
        "message": _PHASE_LABELS.get(agent_id, agent_id),
    }

    yield workflow_event(
        kind="step_done",
        title=_AGENT_LABELS.get(agent_id, agent_id),
        message=_PHASE_LABELS.get(agent_id, agent_id),
        detail=detail,
        agent_id=agent_id,
        status="success",
        category="task",
        event_id=f"task-{agent_id}-active",
    )

    if node_name == "gateway":
        request_type = node_state.get("request_type")
        pipeline = node_state.get("pipeline") or []
        reason = node_state.get("routing_reason") or ""
        label = _REQUEST_TYPE_LABELS.get(request_type, request_type)
        yield {
            "type": "routing",
            "request_type": request_type,
            "reason": reason,
            "pipeline": pipeline,
        }
        yield workflow_event(
            kind="routing",
            title="Request routed",
            message=f"{label} · {reason}".strip(" ·"),
            agent_id="gateway",
            status="info",
            category="routing",
            meta={
                "requestType": request_type,
                "pipeline": pipeline,
                "reason": reason,
            },
            event_id="routing-decision",
        )

    if agent_id == "search_files":
        results = node_state.get("search_results") or []
        if results:
            yield workflow_event(
                kind="search_results",
                title="Search files",
                message=f"Found {len(results)} match{'es' if len(results) != 1 else ''}",
                detail=_format_paths(results),
                agent_id="search_files",
                status="success",
                category="tool",
                meta={"tool": "search_files", "count": len(results)},
                event_id="tool-search-results",
            )
            yield {"type": "files", "files": results}

    if agent_id == "write_code":
        for edit in node_state.get("last_edits") or []:
            file_id = str(edit.get("fileId") or "")
            if file_id and file_id in emitted_edit_ids:
                continue
            if file_id:
                emitted_edit_ids.add(file_id)
            file_path = str(edit.get("filePath") or "unknown")
            yield workflow_event(
                kind="tool_result",
                title="Write file",
                message=file_path,
                detail="Created file" if edit.get("created") else "Updated file",
                agent_id="write_code",
                status="success",
                category="tool",
                meta={"tool": "write_file", "fileId": file_id, "created": bool(edit.get("created"))},
                event_id=f"tool-write-{file_id}",
            )
            yield {"type": "edit", "edit": edit}
            if edit.get("created"):
                yield {"type": "project_changed"}
        writer_text = node_state.get("response_text") or ""
        if writer_text and not streamed_writer_text:
            yield {"type": "token", "content": writer_text}

    if agent_id == "review_code":
        for review in node_state.get("reviews") or []:
            yield workflow_event(
                kind="review",
                title="Code review",
                message=str(review.get("filePath") or "unknown"),
                detail=str(review.get("summary") or ""),
                agent_id="review_code",
                status="success" if review.get("passed") else "warning",
                category="review",
                meta={"passed": bool(review.get("passed")), "issueCount": len(review.get("issues") or [])},
                event_id=f"review-{review.get('fileId')}",
            )
            yield {"type": "review", "review": review}

    if agent_id == "validate_code":
        validation = node_state.get("validation")
        if validation:
            passed = bool(validation.get("passed"))
            yield workflow_event(
                kind="validation",
                title="Validation",
                message="All checks passed" if passed else "Validation issues found",
                detail="; ".join(
                    issue.get("message", "")
                    for issue in (validation.get("issues") or [])[:5]
                ) or None,
                agent_id="validate_code",
                status="success" if passed else "error",
                category="validation",
                meta={
                    "passed": passed,
                    "checks": validation.get("checks") or [],
                    "issueCount": len(validation.get("issues") or []),
                },
                event_id="validation-result",
            )
            yield {"type": "validation", "validation": validation}

    if agent_id == "terminal":
        result = node_state.get("terminal_result") or {}
        steps = result.get("steps") or []
        if steps:
            for step in steps:
                yield {
                    "type": "terminal",
                    "command": str(step.get("command") or ""),
                    "output": str(step.get("output") or ""),
                    "exitCode": step.get("exitCode"),
                    "executed": bool(step.get("executed")),
                    "purpose": step.get("purpose"),
                    "planKind": step.get("planKind"),
                    "agent": step.get("agent"),
                }
        else:
            yield {
                "type": "terminal",
                "command": str(result.get("command") or ""),
                "output": str(result.get("output") or ""),
                "exitCode": result.get("exitCode"),
                "executed": bool(result.get("executed")),
            }
        text = node_state.get("response_text") or ""
        if text:
            yield {"type": "token", "content": text}
        return

    if agent_id in {"chat_response", "explain_response"}:
        text = node_state.get("response_text") or ""
        if text:
            yield {"type": "token", "content": text}


async def _stream_clovops_events(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceAgentSearchRequest,
    *,
    project_title: str = "Project",
) -> AsyncIterator[dict[str, Any]]:
    async for event in _stream_clovops_maf_events(
        user_id,
        project_id,
        body,
        project_title=project_title,
    ):
        yield event


async def stream_clovops_orchestrator(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceAgentSearchRequest,
    *,
    project_title: str = "Project",
) -> AsyncIterator[dict[str, Any]]:
    """UI streaming layer — maps MAF workflow events to SSE events."""
    async for event in _with_heartbeats(
        _stream_clovops_events(
            user_id,
            project_id,
            body,
            project_title=project_title,
        )
    ):
        yield event


async def stream_clovops_orchestrator_resume(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    session_id: str,
    human_input: str,
) -> AsyncIterator[dict[str, Any]]:
    async for event in _with_heartbeats(
        stream_clovops_maf_resume(user_id, project_id, session_id, human_input)
    ):
        yield event
