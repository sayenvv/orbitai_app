from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi.responses import StreamingResponse

_SSE_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


def code_workspace_sse_response(
    event_source: AsyncIterator[dict[str, Any]],
) -> StreamingResponse:
    """SSE with an immediate open comment so proxies flush the first agent events."""

    async def generator() -> AsyncIterator[str]:
        yield ": stream-open\n\n"
        async for event in event_source:
            yield f"data: {json.dumps(event, separators=(',', ':'))}\n\n"

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )
