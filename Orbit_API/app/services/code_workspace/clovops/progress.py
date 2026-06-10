from __future__ import annotations

from langgraph.config import get_stream_writer


def emit_agent_progress(agent_id: str, message: str | None = None) -> None:
    """Push live progress to the SSE stream while a graph node is running."""
    writer = get_stream_writer()
    writer(
        {
            "type": "agent_progress",
            "agentId": agent_id,
            "message": message,
        }
    )
