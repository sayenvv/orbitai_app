from __future__ import annotations

import json
from typing import Any

from autogen_core.tools import FunctionTool

from orbit_orchestration.config import OrchestrationSettings
from orbit_orchestration.langchain.summarizer import summarize_text


def _coerce_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        for key in ("text", "content", "description", "input", "message", "body"):
            item = value.get(key)
            if isinstance(item, str) and item.strip():
                return item.strip()
        return json.dumps(value)
    return str(value).strip()


def build_summarization_tool(settings: OrchestrationSettings | None = None) -> FunctionTool:
    async def _summarize_tool(text: str = "", **kwargs: Any) -> str:
        payload = text if (text and str(text).strip()) else kwargs
        normalized = _coerce_text(payload)
        if not normalized:
            return "No text was provided to summarize."
        return await summarize_text(normalized, settings=settings)

    return FunctionTool(
        _summarize_tool,
        description=(
            "Summarize long text. Argument must be a single string field `text` with the full "
            "content to summarize — not a JSON schema object."
        ),
        name="summarize_text",
    )
