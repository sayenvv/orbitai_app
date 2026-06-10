from __future__ import annotations

import asyncio
import contextlib
import uuid
from collections.abc import AsyncIterator
from typing import Any

_HEARTBEAT_SECONDS = 8

from app.services.code_workspace.clovops.orchestrator import build_clovops_graph
from app.services.code_workspace.clovops.types import ClovopsGraphState
from clovai_apps.code_workspace.schemas import CodeWorkspaceAgentSearchRequest
from orbit_orchestration.domain.message_text import sanitize_for_chat_ui

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
    "terminal": "Checking terminal request…",
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
    agent_id = _effective_agent_id(node_name, node_state)
    detail = _build_log_detail(agent_id, {**final_state, **node_state})
    yield _log_event(
        agent_id=agent_id,
        status="done",
        message=_PHASE_LABELS.get(agent_id, agent_id),
        detail=detail,
        log_id=running_log_ids.pop(agent_id, None),
    )

    yield {
        "type": "phase",
        "phase": agent_id,
        "status": "done",
        "message": _PHASE_LABELS.get(agent_id, agent_id),
    }

    if node_name == "gateway":
        yield {
            "type": "routing",
            "request_type": node_state.get("request_type"),
            "reason": node_state.get("routing_reason"),
            "pipeline": node_state.get("pipeline") or [],
        }

    if agent_id == "search_files":
        results = node_state.get("search_results") or []
        if results:
            yield {"type": "files", "files": results}

    if agent_id == "write_code":
        for edit in node_state.get("last_edits") or []:
            file_id = str(edit.get("fileId") or "")
            if file_id and file_id in emitted_edit_ids:
                continue
            if file_id:
                emitted_edit_ids.add(file_id)
            yield {"type": "edit", "edit": edit}
            if edit.get("created"):
                yield {"type": "project_changed"}
        writer_text = node_state.get("response_text") or ""
        if writer_text and not streamed_writer_text:
            yield {"type": "token", "content": writer_text}

    if agent_id == "review_code":
        for review in node_state.get("reviews") or []:
            yield {"type": "review", "review": review}

    if agent_id == "validate_code":
        validation = node_state.get("validation")
        if validation:
            yield {"type": "validation", "validation": validation}

    if agent_id == "terminal":
        result = node_state.get("terminal_result") or {}
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
    yield {"type": "start", "project_id": str(project_id)}

    graph = build_clovops_graph()
    state = _build_initial_state(user_id, project_id, body, project_title=project_title)

    final_state: dict[str, Any] = dict(state)
    streamed_writer_text = False
    emitted_edit_ids: set[str] = set()
    running_log_ids: dict[str, str] = {}

    try:
        async for mode, chunk in graph.astream(state, stream_mode=["updates", "custom"]):
            if mode == "custom":
                if not isinstance(chunk, dict) or chunk.get("type") != "agent_progress":
                    continue
                agent_id = str(chunk.get("agentId") or "")
                if not agent_id:
                    continue
                running_id = running_log_ids.get(agent_id) or f"{agent_id}-running-{uuid.uuid4().hex[:8]}"
                running_log_ids[agent_id] = running_id
                yield _log_event(
                    agent_id=agent_id,
                    status="running",
                    message=_running_log_message(agent_id, chunk.get("message")),
                    log_id=running_id,
                )
                yield {
                    "type": "phase",
                    "phase": agent_id,
                    "status": "running",
                    "message": _running_log_message(agent_id, chunk.get("message")),
                }
                continue

            if mode != "updates" or not isinstance(chunk, dict):
                continue

            for node_name, node_state in chunk.items():
                final_state.update(node_state)
                async for event in _emit_node_completion(
                    node_name,
                    node_state,
                    final_state=final_state,
                    running_log_ids=running_log_ids,
                    emitted_edit_ids=emitted_edit_ids,
                    streamed_writer_text=streamed_writer_text,
                ):
                    if event.get("type") == "token" and not streamed_writer_text:
                        streamed_writer_text = True
                    yield event

        response_text = sanitize_for_chat_ui(final_state.get("response_text") or "") or (
            "Done."
        )
        yield {
            "type": "done",
            "content": response_text,
            "files": final_state.get("search_results") or [],
            "edits": final_state.get("edits") or [],
            "reviews": final_state.get("reviews") or [],
            "plan": final_state.get("plan"),
            "request_type": final_state.get("request_type"),
            "pipeline": final_state.get("pipeline") or [],
        }
    except Exception as exc:
        for agent_id, log_id in list(running_log_ids.items()):
            yield _log_event(
                agent_id=agent_id,
                status="error",
                message=_PHASE_LABELS.get(agent_id, agent_id),
                detail=str(exc),
                log_id=log_id,
            )
        yield {"type": "error", "detail": str(exc)}


async def stream_clovops_orchestrator(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceAgentSearchRequest,
    *,
    project_title: str = "Project",
) -> AsyncIterator[dict[str, Any]]:
    """UI streaming layer — maps graph node updates to SSE events."""
    async for event in _with_heartbeats(
        _stream_clovops_events(
            user_id,
            project_id,
            body,
            project_title=project_title,
        )
    ):
        yield event
