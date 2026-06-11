from __future__ import annotations

from collections.abc import Callable
from contextvars import ContextVar, Token
from typing import Any

_progress_sink: ContextVar[Callable[[dict[str, Any]], None] | None] = ContextVar(
    "clovops_progress_sink",
    default=None,
)


def set_progress_sink(sink: Callable[[dict[str, Any]], None] | None) -> Token:
    return _progress_sink.set(sink)


def reset_progress_sink(token: Token) -> None:
    _progress_sink.reset(token)


def emit_maf_agent_progress(agent_id: str, message: str | None = None) -> None:
    sink = _progress_sink.get()
    if sink is None:
        return
    sink(
        {
            "type": "agent_progress",
            "agentId": agent_id,
            "message": message,
        }
    )


def emit_maf_terminal_output(
    *,
    command: str,
    output: str,
    exit_code: int | None = None,
    executed: bool = True,
    purpose: str | None = None,
    plan_kind: str | None = None,
    plan_cycle: int | None = None,
    agent: str | None = None,
) -> None:
    sink = _progress_sink.get()
    if sink is None:
        return
    sink(
        {
            "type": "terminal",
            "command": command,
            "output": output,
            "exitCode": exit_code,
            "executed": executed,
            "purpose": purpose,
            "planKind": plan_kind,
            "planCycle": plan_cycle,
            "agent": agent,
        }
    )


def emit_maf_workflow_event(**payload: Any) -> None:
    from app.services.code_workspace.clovops.workflow_events import workflow_event

    sink = _progress_sink.get()
    if sink is None:
        return
    sink(workflow_event(**payload))
