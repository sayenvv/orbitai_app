from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any

from app.services.code_workspace.clovops.stream import stream_clovops_orchestrator
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
