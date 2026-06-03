from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from orbit_orchestration.domain.message_text import is_valid_chat_ui_content, sanitize_for_chat_ui
from orbit_orchestration.domain.routing import TaskRouting
from orbit_orchestration.domain.streaming import stream_text_chunks
from orbit_orchestration.domain.session import OrchestrationSession
from orbit_orchestration.domain.types import OrchestrationMessage, OrchestrationStatus


def routing_payload(routing: TaskRouting | None) -> dict[str, Any] | None:
    if routing is None:
        return None
    return {
        "primary_agent": routing.primary_agent,
        "selected_agents": list(routing.selected_agents),
        "intent": routing.intent,
        "topics": list(routing.topics),
        "reasoning": routing.reasoning,
    }


def status_value(session: OrchestrationSession) -> str:
    return (
        session.status.value
        if hasattr(session.status, "value")
        else str(session.status)
    )


def start_event(session: OrchestrationSession) -> dict[str, Any]:
    return {
        "type": "start",
        "session_id": session.session_id,
        "status": status_value(session),
    }


def meta_event(session: OrchestrationSession) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "type": "meta",
        "orchestration_status": status_value(session),
    }
    routing = routing_payload(session.routing)
    if routing:
        payload["routing"] = routing
    if session.human_prompt:
        payload["human_prompt"] = session.human_prompt
    return payload


def message_event(msg: OrchestrationMessage) -> dict[str, Any]:
    return {
        "type": "message",
        "source": msg.source,
        "content": msg.content,
    }


def done_event(session: OrchestrationSession, *, run_factory) -> dict[str, Any]:
    run = run_factory(session)
    status = run.status.value if hasattr(run.status, "value") else str(run.status)
    return {
        "type": "done",
        "session_id": run.session_id,
        "status": status,
        "task": run.task,
        "routing": routing_payload(run.routing),
        "messages": [{"source": m.source, "content": m.content} for m in run.messages],
        "human_prompt": run.human_prompt,
        "result": run.result,
        "error": run.error,
    }


async def stream_display_text(text: str) -> AsyncIterator[dict[str, Any]]:
    safe = sanitize_for_chat_ui(text)
    if not safe or not is_valid_chat_ui_content(safe):
        return
    async for token in stream_text_chunks(safe):
        yield {"type": "token", "content": token}


def is_completed(session: OrchestrationSession) -> bool:
    return status_value(session) == OrchestrationStatus.completed.value
