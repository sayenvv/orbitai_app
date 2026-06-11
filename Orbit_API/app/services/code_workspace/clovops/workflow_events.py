from __future__ import annotations

import uuid
from typing import Any


def workflow_event(
    *,
    kind: str,
    title: str,
    message: str | None = None,
    detail: str | None = None,
    agent_id: str | None = None,
    status: str = "info",
    category: str = "background",
    meta: dict[str, Any] | None = None,
    event_id: str | None = None,
) -> dict[str, Any]:
    """Structured workflow event for the chat UI timeline."""
    return {
        "type": "workflow",
        "id": event_id or str(uuid.uuid4()),
        "kind": kind,
        "title": title,
        "message": message,
        "detail": detail,
        "agentId": agent_id,
        "status": status,
        "category": category,
        "meta": meta or {},
    }
