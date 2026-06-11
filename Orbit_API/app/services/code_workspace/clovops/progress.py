from __future__ import annotations

from typing import Any

from app.services.code_workspace.clovops.maf.progress import (
    emit_maf_agent_progress,
    emit_maf_terminal_output,
    emit_maf_workflow_event,
)


def emit_agent_progress(agent_id: str, message: str | None = None) -> None:
    """Push live progress to the SSE stream while a pipeline step is running."""
    emit_maf_agent_progress(agent_id, message)


def emit_terminal_output(
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
    """Stream terminal command output to the chat UI while orchestrator steps run."""
    emit_maf_terminal_output(
        command=command,
        output=output,
        exit_code=exit_code,
        executed=executed,
        purpose=purpose,
        plan_kind=plan_kind,
        plan_cycle=plan_cycle,
        agent=agent,
    )


def emit_workflow_event(**payload: Any) -> None:
    """Push a structured workflow event to the SSE stream."""
    emit_maf_workflow_event(**payload)
