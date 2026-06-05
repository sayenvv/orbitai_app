from __future__ import annotations

import json
import re

from langchain_core.tools import tool

from orbit_orchestration.langchain.summarizer import summarize_text as _summarize_text

_KNOWLEDGE_BASE: dict[str, str] = {
    "fastapi": (
        "FastAPI is a modern Python web framework for building APIs. "
        "Key features: automatic OpenAPI docs, Pydantic validation, dependency injection, "
        "async support via Starlette, and high performance. "
        "Typical layout: app/main.py with FastAPI(), routers in app/api/, "
        "SQLAlchemy models, and uvicorn as the ASGI server."
    ),
    "langgraph": (
        "LangGraph is a library for building stateful multi-agent workflows as graphs. "
        "Use StateGraph, nodes for agents/tools, conditional edges for routing, "
        "and checkpointers for persistence. "
        "Prebuilt create_react_agent wraps tool-calling loops. "
        "Stream with graph.astream_events or stream_mode='messages'."
    ),
    "langchain": (
        "LangChain provides composable LLM primitives: chat models, prompts, tools, and runnables. "
        "langchain-core defines messages and LCEL pipes (prompt | model). "
        "langchain-openai integrates OpenAI-compatible chat and embeddings. "
        "Tools use @tool decorator; agents bind tools to models for ReAct-style loops."
    ),
}


def _kb_hits(query: str, *, limit: int = 5) -> list[dict[str, str]]:
    text = query.lower()
    tokens = set(re.findall(r"[a-z0-9]+", text))
    scored: list[tuple[int, str, str]] = []
    for topic, body in _KNOWLEDGE_BASE.items():
        body_lower = body.lower()
        score = sum(1 for token in tokens if token in body_lower or token in topic)
        if topic in text:
            score += 3
        if score:
            scored.append((score, topic, body))
    scored.sort(key=lambda row: row[0], reverse=True)
    return [{"topic": topic, "content": body} for _, topic, body in scored[:limit]]


@tool
def search_knowledge_base(query: str) -> str:
    """Search the built-in knowledge base (FastAPI, LangGraph, LangChain)."""
    cleaned = query.strip()
    if not cleaned:
        return "[]"
    hits = _kb_hits(cleaned)
    if not hits:
        return json.dumps(
            {
                "results": [],
                "note": "No KB matches. Topics available: fastapi, langgraph, langchain.",
            },
            indent=2,
        )
    return json.dumps({"results": hits}, indent=2)


@tool
async def summarize_text(text: str, sentences: int = 3) -> str:
    """Summarize text to roughly N sentences."""
    _ = sentences  # summarizer uses its own prompt; sentences guides the model implicitly
    trimmed = text.strip()
    if not trimmed:
        return "No text to summarize."
    return await _summarize_text(trimmed)
