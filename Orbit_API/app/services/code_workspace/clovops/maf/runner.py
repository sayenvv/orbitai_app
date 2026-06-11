from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any, cast

from agent_framework import AgentExecutorResponse, AgentResponseUpdate, Message, WorkflowEvent

from app.services.code_workspace.clovops.context_builder import format_context_for_llm
from app.services.code_workspace.clovops.maf.agents import build_clovops_agents
from app.services.code_workspace.clovops.maf.client import create_maf_chat_client
from app.services.code_workspace.clovops.maf.hitl import ClovopsHitlSession, get_clovops_hitl_store
from app.services.code_workspace.clovops.maf.progress import reset_progress_sink, set_progress_sink
from app.services.code_workspace.clovops.maf.workflow import select_group_chat_workflow
from app.services.code_workspace.clovops.pipeline_runner import run_clovops_pipeline
from app.services.code_workspace.clovops.types import ClovopsGraphState
from clovai_apps.code_workspace.schemas import CodeWorkspaceAgentSearchRequest
from orbit_orchestration.domain.message_text import sanitize_for_chat_ui


def _needs_plan_review(state: ClovopsGraphState) -> bool:
    request_type = state.get("request_type")
    if request_type not in {"code_edit", "bug_fix"}:
        return False
    pipeline = state.get("pipeline") or []
    return "plan_changes" in pipeline and "write_code" in pipeline


def _group_chat_task(state: ClovopsGraphState, *, phase: str) -> str:
    parts = [
        f"Project: {state.get('project_title') or 'Project'}",
        f"User request:\n{state.get('user_request') or ''}",
    ]
    session_context = (state.get("session_context") or "").strip()
    if session_context:
        parts.append(session_context)
    if state.get("plan"):
        parts.append(f"Implementation plan:\n{state['plan']}")
    context_files = state.get("context_files") or []
    if context_files:
        parts.append(f"Project context:\n{format_context_for_llm(context_files)}")
    if phase == "plan_review":
        parts.append(
            "Review the implementation plan as a team. The human may approve or request revisions."
        )
    elif phase == "collaboration":
        parts.append(
            "Collaborate on implementing the approved plan. Writer proposes changes; "
            "reviewer and validator critique before execution."
        )
    elif state.get("request_type") == "terminal":
        parts.append("Propose a safe terminal command for this request.")
    return "\n\n".join(parts)


def _agent_id_from_executor(executor_id: str | None) -> str:
    mapping = {
        "Planner": "plan_changes",
        "CodeWriter": "write_code",
        "CodeReviewer": "review_code",
        "Validator": "validate_code",
        "TerminalAgent": "terminal",
        "Assistant": "chat_response",
        "ClovopsManager": "gateway",
    }
    if not executor_id:
        return "gateway"
    return mapping.get(executor_id, executor_id)


def _active_log_id(agent_id: str) -> str:
    return f"{agent_id}-active"


async def _yield_progress_events(
    progress_queue: list[dict[str, Any]],
    running_log_ids: dict[str, str],
) -> AsyncIterator[dict[str, Any]]:
    from app.services.code_workspace.clovops.stream import _log_event, _running_log_message

    while progress_queue:
        chunk = progress_queue.pop(0)
        chunk_type = str(chunk.get("type") or "agent_progress")
        if chunk_type == "workflow":
            yield chunk
            continue
        if chunk_type == "terminal":
            yield {
                "type": "terminal",
                "command": str(chunk.get("command") or ""),
                "output": str(chunk.get("output") or ""),
                "exitCode": chunk.get("exitCode"),
                "executed": bool(chunk.get("executed", True)),
                "purpose": chunk.get("purpose"),
                "planKind": chunk.get("planKind"),
                "planCycle": chunk.get("planCycle"),
                "agent": chunk.get("agent"),
            }
            continue

        agent_id = str(chunk.get("agentId") or "")
        if not agent_id:
            continue
        running_id = running_log_ids.get(agent_id) or _active_log_id(agent_id)
        running_log_ids[agent_id] = running_id
        message = _running_log_message(agent_id, chunk.get("message"))
        yield _log_event(
            agent_id=agent_id,
            status="running",
            message=message,
            log_id=running_id,
        )
        yield {
            "type": "phase",
            "phase": agent_id,
            "status": "running",
            "message": message,
        }


async def _emit_agent_running(
    agent_id: str,
    running_log_ids: dict[str, str],
    *,
    message: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    from app.services.code_workspace.clovops.stream import (
        _AGENT_LABELS,
        _log_event,
        _running_log_message,
    )
    from app.services.code_workspace.clovops.workflow_events import workflow_event

    log_id = running_log_ids.get(agent_id) or _active_log_id(agent_id)
    running_log_ids[agent_id] = log_id
    text = _running_log_message(agent_id, message)
    yield _log_event(
        agent_id=agent_id,
        status="running",
        message=text,
        log_id=log_id,
    )
    yield {
        "type": "phase",
        "phase": agent_id,
        "status": "running",
        "message": text,
    }
    yield workflow_event(
        kind="step_start",
        title=_AGENT_LABELS.get(agent_id, agent_id),
        message=text,
        agent_id=agent_id,
        status="running",
        category="task",
        event_id=f"task-{agent_id}-active",
    )


async def _stream_group_chat_phase(
    state: ClovopsGraphState,
    *,
    phase: str,
    user_id: str,
    project_id: str,
) -> AsyncIterator[dict[str, Any]]:
    client = create_maf_chat_client()
    agents = build_clovops_agents(client)
    workflow = select_group_chat_workflow(
        agents,
        request_type=state.get("request_type"),
        phase=phase,
    )
    task = _group_chat_task(state, phase=phase)
    stream = workflow.run(task, stream=True)

    last_response_id: str | None = None
    pending_requests: dict[str, AgentExecutorResponse] = {}

    async for event in stream:
        event = cast(WorkflowEvent, event)
        if event.type == "request_info" and isinstance(event.data, AgentExecutorResponse):
            pending_requests[event.request_id] = event.data
            continue

        if event.type in ("intermediate", "output"):
            data = event.data
            if isinstance(data, AgentResponseUpdate):
                agent_id = _agent_id_from_executor(
                    data.author_name or data.agent_id or event.executor_id
                )
                rid = data.response_id
                if rid != last_response_id:
                    last_response_id = rid
                if data.text:
                    yield {"type": "token", "content": data.text, "agentId": agent_id}
            elif event.type == "output":
                outputs = cast(list[Message], data)
                summary = "\n".join(
                    f"{msg.author_name or msg.role}: {msg.text}"
                    for msg in outputs
                    if msg.text
                ).strip()
                if summary:
                    state["response_text"] = summary

    if pending_requests:
        request_id, request = next(iter(pending_requests.items()))
        agent_name = request.executor_id or "Planner"
        agent_id = _agent_id_from_executor(agent_name)
        plan_text = str(state.get("plan") or "").strip()
        discussion = str(state.get("response_text") or "").strip()
        prompt = (
            f"{agent_name} is ready to proceed. Review the plan and reply with feedback, "
            "or send an empty approval to continue."
        )
        session = get_clovops_hitl_store().create(
            user_id=user_id,
            project_id=project_id,
            state=dict(state),
            human_prompt=prompt,
            pending_agent=agent_id,
            request_id=request_id,
            workflow_phase=phase,
            conversation_task=task,
        )
        yield {
            "type": "await_human",
            "session_id": session.session_id,
            "human_prompt": prompt,
            "plan": plan_text or None,
            "discussion": discussion or None,
            "pending_agent": agent_id,
            "status": "awaiting_human",
        }


async def _stream_clovops_maf_events(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceAgentSearchRequest,
    *,
    project_title: str = "Project",
    resume_session: ClovopsHitlSession | None = None,
    human_input: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    from app.services.code_workspace.clovops.stream import (
        _build_initial_state,
        _emit_node_completion,
    )

    if resume_session:
        state: ClovopsGraphState = dict(resume_session.state)
        yield {"type": "start", "project_id": str(project_id), "resumed": True}

        feedback = (human_input or "").strip()
        if feedback:
            prior = (state.get("session_context") or "").strip()
            state["session_context"] = (
                f"{prior}\n\nHuman plan review feedback:\n{feedback}".strip()
                if prior
                else f"Human plan review feedback:\n{feedback}"
            )
            # Fresh group-chat run with feedback — cannot call run(responses=...) on a
            # new workflow instance (MAF requires pending requests from the same run).
            async for event in _stream_group_chat_phase(
                state,
                phase=resume_session.workflow_phase,
                user_id=str(user_id),
                project_id=str(project_id),
            ):
                if event.get("type") == "await_human":
                    yield event
                    return
                yield event
        else:
            from app.services.code_workspace.clovops.workflow_events import workflow_event

            yield workflow_event(
                kind="plan_approved",
                title="Plan approved",
                message="Plan approved. Planning the next steps…",
                agent_id="plan_changes",
                status="success",
                category="plan",
                event_id="plan-approved",
            )

        start_after_gateway = True
        state["pipeline_completed"] = _pipeline_index_after(state, "plan_changes")
    else:
        yield {"type": "start", "project_id": str(project_id)}
        from app.services.code_workspace.clovops.workflow_events import workflow_event

        yield workflow_event(
            kind="run_started",
            title="Workflow started",
            message="Analyzing request and preparing pipeline",
            status="running",
            category="background",
            event_id="run-started",
        )
        state = _build_initial_state(user_id, project_id, body, project_title=project_title)
        start_after_gateway = False

    final_state: dict[str, Any] = dict(state)
    running_log_ids: dict[str, str] = {}
    emitted_edit_ids: set[str] = set()
    streamed_writer_text = False
    plan_review_done = resume_session is not None
    progress_queue: list[dict[str, Any]] = []
    progress_token = set_progress_sink(progress_queue.append)

    try:
        async for node_name, node_state, merged in run_clovops_pipeline(
            state,
            start_after_gateway=start_after_gateway,
        ):
            if node_name == "tick":
                async for progress_event in _yield_progress_events(progress_queue, running_log_ids):
                    yield progress_event
                continue

            if node_name == "step_start":
                agent_id = str(node_state.get("agent_id") or "").strip()
                if agent_id:
                    async for event in _emit_agent_running(agent_id, running_log_ids):
                        yield event
                continue

            async for progress_event in _yield_progress_events(progress_queue, running_log_ids):
                yield progress_event

            final_state.update(merged)

            if (
                not plan_review_done
                and node_name == "pipeline_runner"
                and node_state.get("last_pipeline_step") == "plan_changes"
                and _needs_plan_review(final_state)
            ):
                plan_review_done = True
                async for gc_event in _stream_group_chat_phase(
                    final_state,
                    phase="plan_review",
                    user_id=str(user_id),
                    project_id=str(project_id),
                ):
                    if gc_event.get("type") == "await_human":
                        yield gc_event
                        return
                    yield gc_event

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

        async for progress_event in _yield_progress_events(progress_queue, running_log_ids):
            yield progress_event

        response_text = sanitize_for_chat_ui(final_state.get("response_text") or "") or "Done."
        from app.services.code_workspace.clovops.workflow_events import workflow_event

        yield workflow_event(
            kind="run_completed",
            title="Workflow completed",
            message=response_text[:240],
            status="success",
            category="background",
            meta={
                "requestType": final_state.get("request_type"),
                "pipeline": final_state.get("pipeline") or [],
            },
            event_id="run-completed",
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
            "orchestrator": "maf",
        }
    except Exception as exc:
        yield {"type": "error", "detail": str(exc)}
    finally:
        reset_progress_sink(progress_token)


def _pipeline_index_after(state: ClovopsGraphState, step: str) -> int:
    pipeline = state.get("pipeline") or []
    try:
        return pipeline.index(step) + 1
    except ValueError:
        return int(state.get("pipeline_completed") or 0)


async def stream_clovops_maf_resume(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    session_id: str,
    human_input: str,
) -> AsyncIterator[dict[str, Any]]:
    session = get_clovops_hitl_store().pop(session_id)
    if session is None:
        yield {"type": "error", "detail": "Unknown or expired Clovops session."}
        return
    if session.user_id != str(user_id) or session.project_id != str(project_id):
        yield {"type": "error", "detail": "Session does not match this project."}
        return

    body = CodeWorkspaceAgentSearchRequest(
        message=session.state.get("user_request") or human_input,
        history=[],
        active_file_id=session.state.get("active_file_id"),
        active_file_path=session.state.get("active_file_path"),
    )
    async for event in _stream_clovops_maf_events(
        user_id,
        project_id,
        body,
        project_title=session.state.get("project_title") or "Project",
        resume_session=session,
        human_input=human_input,
    ):
        yield event
