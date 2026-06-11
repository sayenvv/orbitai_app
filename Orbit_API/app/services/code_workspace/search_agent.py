from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any

from app.services.code_workspace.clovops.stream import (
    stream_clovops_orchestrator,
    stream_clovops_orchestrator_resume,
)
from clovai_apps.code_workspace.schemas import CodeWorkspaceAgentSearchRequest


async def stream_code_workspace_search_agent(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceAgentSearchRequest,
    *,
    project_title: str = "Project",
) -> AsyncIterator[dict[str, Any]]:
    """Clovops multi-agent orchestrator (gateway → search → context → plan → write → review → validate)."""
    async for event in stream_clovops_orchestrator(
        user_id,
        project_id,
        body,
        project_title=project_title,
    ):
        yield event


async def stream_code_workspace_search_agent_resume(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    session_id: str,
    human_input: str,
) -> AsyncIterator[dict[str, Any]]:
    """Resume a paused Clovops workflow after human plan review."""
    async for event in stream_clovops_orchestrator_resume(
        user_id,
        project_id,
        session_id,
        human_input,
    ):
        yield event
