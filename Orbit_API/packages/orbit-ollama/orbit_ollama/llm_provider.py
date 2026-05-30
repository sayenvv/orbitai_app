"""Low-level provider streaming — prefer orbit_ollama.utils for API calls."""

from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass

from orbit_ollama.chat import resolve_ollama_model, stream_chat
from orbit_ollama.client import OllamaClient
from orbit_ollama.config import OllamaSettings


@dataclass(slots=True)
class AgentChatInput:
    """One turn of agent chat (matches DB agent config + conversation history)."""

    system_prompt: str
    model: str
    temperature: float
    max_tokens: int | None
    history: list[tuple[str, str]]
    user_message: str


async def stream_ollama(
    chat: AgentChatInput,
    *,
    settings: OllamaSettings | None = None,
    client: OllamaClient | None = None,
) -> AsyncIterator[str]:
    settings = settings or OllamaSettings()
    client = client or OllamaClient(settings)
    model = resolve_ollama_model(chat.model, settings.default_model)

    async for token in stream_chat(
        client,
        model=model,
        system_prompt=chat.system_prompt,
        history=chat.history,
        user_message=chat.user_message,
        temperature=chat.temperature,
        max_tokens=chat.max_tokens,
    ):
        yield token
