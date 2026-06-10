from __future__ import annotations

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, StateGraph

from app.db.session import SessionLocal
from app.services.code_workspace.agent_tools import search_code_workspace_files_for_agent
from app.services.code_workspace.clovops.context_builder import build_file_context, format_context_for_llm
from app.services.code_workspace.clovops.indexing import build_project_file_map, search_file_map
from app.services.code_workspace.clovops.memory import build_session_context
from app.services.code_workspace.clovops.planner import create_implementation_plan
from app.services.code_workspace.clovops.progress import emit_agent_progress
from app.services.code_workspace.clovops.router import plan_clovops_flow
from app.services.code_workspace.clovops.terminal import infer_terminal_command, run_safe_terminal_command
from app.services.code_workspace.clovops.types import ClovopsGraphState, ClovopsPipelineStep
from app.services.code_workspace.clovops.validation import validate_edited_files
from app.services.code_workspace.clovops.writer import run_code_writer
from app.services.code_workspace.reviewer import review_code_workspace_file
from orbit_orchestration.config import get_orchestration_settings
from orbit_orchestration.langchain.llm_factory import create_chat_model

_CHAT_PROMPT = (
    "You are Clovops IDE assistant inside a code workspace.\n"
    "Reply briefly and warmly. Do not invent project details.\n"
    "If helpful, mention you can search files, edit code, run scripts, or explain the project."
)

_EXPLAIN_PROMPT = (
    "You are Clovops IDE assistant. Answer using only the provided project context.\n"
    "Cite file paths from context. Be concise."
)

_SUMMARIZE_PROMPT = (
    "You are Clovops IDE assistant. Summarize the project structure and purpose using only the provided context.\n"
    "Cover main components, technologies, and how pieces fit together. Cite file paths. Be structured and concise."
)


def _search_query_from_request(state: ClovopsGraphState) -> str:
    custom = (state.get("search_query") or "").strip()
    if custom:
        return custom
    return state["user_request"].strip()


def _pick_file_ids(
    search_results: list[dict],
    active_file_id: str | None,
    file_map: list[dict] | None = None,
    *,
    limit: int = 4,
) -> list[str]:
    ids: list[str] = []
    if active_file_id:
        ids.append(active_file_id)
    for item in search_results:
        file_id = str(item.get("fileId") or "")
        if file_id and file_id not in ids:
            ids.append(file_id)
        if len(ids) >= limit:
            return ids
    if len(ids) < limit and file_map:
        for item in file_map[: limit - len(ids)]:
            file_id = str(item.get("fileId") or "")
            if file_id and file_id not in ids:
                ids.append(file_id)
    return ids


async def _gateway_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("gateway")
    session_context = build_session_context(
        history=state.get("history") or [],
        user_request=state["user_request"],
        active_file_path=state.get("active_file_path"),
        project_title=state.get("project_title", "Project"),
    )
    flow = await plan_clovops_flow(
        user_request=state["user_request"],
        session_context=session_context,
        active_file_path=state.get("active_file_path"),
        project_title=state.get("project_title", "Project"),
    )
    return {
        **flow,
        "session_context": session_context,
        "pipeline_completed": 0,
        "retry_count": 0,
    }


def _index_project_sync(state: ClovopsGraphState) -> dict[str, Any]:
    db = SessionLocal()
    try:
        file_map = build_project_file_map(
            db,
            uuid.UUID(state["user_id"]),
            uuid.UUID(state["project_id"]),
        )
        return {"file_map": file_map}
    finally:
        db.close()


async def _index_project_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("index_project")
    return await asyncio.to_thread(_index_project_sync, state)


def _search_files_sync(state: ClovopsGraphState) -> dict[str, Any]:
    db = SessionLocal()
    try:
        payload = search_code_workspace_files_for_agent(
            db,
            uuid.UUID(state["user_id"]),
            project_id=state["project_id"],
            query=_search_query_from_request(state),
            mode="filename",
            max_results=12,
        )
        results = payload.get("results") or []
        if not results:
            results = search_file_map(state.get("file_map") or [], state["user_request"])
        return {"search_results": results}
    finally:
        db.close()


async def _search_files_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("search_files")
    return await asyncio.to_thread(_search_files_sync, state)


def _build_context_sync(state: ClovopsGraphState) -> dict[str, Any]:
    db = SessionLocal()
    try:
        file_ids = _pick_file_ids(
            state.get("search_results") or [],
            state.get("active_file_id"),
            state.get("file_map") or [],
        )
        context_files = build_file_context(
            db,
            uuid.UUID(state["user_id"]),
            uuid.UUID(state["project_id"]),
            file_ids,
        )
        return {"context_files": context_files}
    finally:
        db.close()


async def _build_context_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("build_context")
    return await asyncio.to_thread(_build_context_sync, state)


async def _plan_changes_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("plan_changes")
    plan, planned_files, plan_updates, plan_creates = await create_implementation_plan(
        user_request=state["user_request"],
        request_type=state["request_type"],
        search_results=state.get("search_results") or [],
        context_files=state.get("context_files") or [],
        session_context=state.get("session_context") or "",
    )
    return {
        "plan": plan,
        "planned_files": planned_files,
        "plan_updates": plan_updates,
        "plan_creates": plan_creates,
    }


async def _write_code_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("write_code")
    retry_count = state.get("retry_count") or 0
    if state.get("needs_fix") and state.get("reviews"):
        retry_count += 1

    prior_edits = list(state.get("edits") or [])
    response_text, new_edits = await run_code_writer(
        uuid.UUID(state["user_id"]),
        uuid.UUID(state["project_id"]),
        user_request=state["user_request"],
        plan=state.get("plan") or "",
        context_files=state.get("context_files") or [],
        planned_files=state.get("planned_files") or [],
        plan_updates=state.get("plan_updates") or [],
        plan_creates=state.get("plan_creates") or [],
        session_context=state.get("session_context") or "",
    )
    return {
        "response_text": response_text,
        "edits": prior_edits + new_edits,
        "last_edits": new_edits,
        "retry_count": retry_count,
        "needs_fix": False,
    }


async def _review_code_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("review_code")
    edits = state.get("last_edits") or state.get("edits") or []
    if not edits:
        return {"reviews": [], "needs_fix": False}

    reviews: list[dict] = []
    needs_fix = False
    db = SessionLocal()
    try:
        for edit in edits:
            file_id = str(edit.get("fileId") or "")
            if not file_id:
                continue
            review = await review_code_workspace_file(
                db,
                uuid.UUID(state["user_id"]),
                uuid.UUID(state["project_id"]),
                file_id=file_id,
                user_request=state["user_request"],
            )
            reviews.append(review)
            if not review.get("passed"):
                needs_fix = True
    finally:
        db.close()

    prior = list(state.get("reviews") or [])
    return {"reviews": prior + reviews, "needs_fix": needs_fix}


async def _validate_code_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("validate_code")
    file_ids = [
        str(item.get("fileId"))
        for item in (state.get("last_edits") or state.get("edits") or [])
        if item.get("fileId")
    ]
    if not file_ids:
        return {"validation": {"passed": True, "issues": [], "checks": []}}

    db = SessionLocal()
    try:
        validation = validate_edited_files(
            db,
            uuid.UUID(state["user_id"]),
            uuid.UUID(state["project_id"]),
            file_ids,
        )
    finally:
        db.close()

    return {"validation": validation, "needs_fix": not validation.get("passed", True)}


async def _chat_response_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("chat_response")
    settings = get_orchestration_settings()
    llm = create_chat_model(settings)
    prompt = (
        f"{state.get('session_context') or ''}\n\n"
        f"User message:\n{state['user_request']}"
    )
    response = await llm.ainvoke(
        [SystemMessage(content=_CHAT_PROMPT), HumanMessage(content=prompt)]
    )
    raw = response.content
    text = raw if isinstance(raw, str) else str(raw or "")
    return {"response_text": text}


async def _explain_response_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("explain_response")
    mode = state.get("response_mode") or "explain"
    system_prompt = _SUMMARIZE_PROMPT if mode == "summarize" else _EXPLAIN_PROMPT

    settings = get_orchestration_settings()
    llm = create_chat_model(settings)
    prompt = (
        f"{state.get('session_context') or ''}\n\n"
        f"User request:\n{state['user_request']}\n\n"
        f"Context:\n{format_context_for_llm(state.get('context_files') or [])}"
    )
    response = await llm.ainvoke(
        [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
    )
    raw = response.content
    text = raw if isinstance(raw, str) else str(raw or "")
    return {"response_text": text}


async def _terminal_node(state: ClovopsGraphState) -> dict[str, Any]:
    emit_agent_progress("terminal")
    db = SessionLocal()
    try:
        command = (state.get("terminal_command") or "").strip()
        if not command:
            file_map = state.get("file_map") or []
            if not file_map:
                file_map = build_project_file_map(
                    db,
                    uuid.UUID(state["user_id"]),
                    uuid.UUID(state["project_id"]),
                )
            command = await infer_terminal_command(
                user_request=state["user_request"],
                file_map=file_map,
                active_file_path=state.get("active_file_path"),
                project_title=state.get("project_title", "Project"),
            )
        effective = command or state["user_request"]
        result = run_safe_terminal_command(
            db,
            uuid.UUID(state["user_id"]),
            uuid.UUID(state["project_id"]),
            command=effective,
            active_file_path=state.get("active_file_path"),
        )
    finally:
        db.close()
    return {"response_text": result.get("output", ""), "terminal_result": result}


STEP_RUNNERS: dict[ClovopsPipelineStep, Callable[[ClovopsGraphState], Awaitable[dict[str, Any]]]] = {
    "index_project": _index_project_node,
    "search_files": _search_files_node,
    "build_context": _build_context_node,
    "plan_changes": _plan_changes_node,
    "write_code": _write_code_node,
    "review_code": _review_code_node,
    "validate_code": _validate_code_node,
    "chat_response": _chat_response_node,
    "explain_response": _explain_response_node,
    "terminal": _terminal_node,
}

_EDIT_STEPS = frozenset({"write_code", "review_code", "validate_code"})


def _adapt_pipeline(
    state: ClovopsGraphState,
    step: ClovopsPipelineStep,
    result: dict[str, Any],
    *,
    completed: int,
) -> list[ClovopsPipelineStep] | None:
    """Adjust remaining steps based on runtime outcomes."""
    pipeline = list(state.get("pipeline") or [])
    remaining = pipeline[completed + 1 :]

    if step == "plan_changes":
        has_work = bool(
            result.get("planned_files")
            or result.get("plan_creates")
            or result.get("plan_updates")
        )
        request_type = state.get("request_type")
        if not has_work and request_type not in {"code_edit", "bug_fix"}:
            trimmed = [s for s in remaining if s not in _EDIT_STEPS]
            if "explain_response" not in trimmed:
                trimmed = ["explain_response", *trimmed]
            return pipeline[: completed + 1] + trimmed

    if step == "write_code" and not result.get("last_edits"):
        trimmed = [s for s in remaining if s != "review_code"]
        return pipeline[: completed + 1] + trimmed

    if step == "validate_code":
        merged_needs_fix = result.get("needs_fix", state.get("needs_fix"))
        retry_count = result.get("retry_count", state.get("retry_count")) or 0
        if merged_needs_fix and retry_count < 1:
            return pipeline[: completed + 1] + ["write_code", "review_code", "validate_code"]

    return None


async def _pipeline_runner_node(state: ClovopsGraphState) -> dict[str, Any]:
    pipeline = state.get("pipeline") or []
    completed = state.get("pipeline_completed") or 0
    if completed >= len(pipeline):
        return {}

    step = pipeline[completed]
    runner = STEP_RUNNERS.get(step)
    if runner is None:
        return {
            "pipeline_completed": completed + 1,
            "last_pipeline_step": step,
            "error": f"Unknown pipeline step: {step}",
        }

    result = await runner(state)
    merged_state: ClovopsGraphState = {**state, **result}
    adapted = _adapt_pipeline(merged_state, step, result, completed=completed)
    updates: dict[str, Any] = {
        **result,
        "pipeline_completed": completed + 1,
        "last_pipeline_step": step,
    }
    if adapted is not None:
        updates["pipeline"] = adapted
    return updates


def _route_after_pipeline(state: ClovopsGraphState) -> str:
    pipeline = state.get("pipeline") or []
    completed = state.get("pipeline_completed") or 0
    if completed < len(pipeline):
        return "pipeline_runner"
    return END


_CLOVOPS_GRAPH = None


def build_clovops_graph():
    global _CLOVOPS_GRAPH  # noqa: PLW0603
    if _CLOVOPS_GRAPH is not None:
        return _CLOVOPS_GRAPH

    graph = StateGraph(ClovopsGraphState)

    graph.add_node("gateway", _gateway_node)
    graph.add_node("pipeline_runner", _pipeline_runner_node)

    graph.set_entry_point("gateway")
    graph.add_edge("gateway", "pipeline_runner")
    graph.add_conditional_edges(
        "pipeline_runner",
        _route_after_pipeline,
        {"pipeline_runner": "pipeline_runner", END: END},
    )

    _CLOVOPS_GRAPH = graph.compile()
    return _CLOVOPS_GRAPH
