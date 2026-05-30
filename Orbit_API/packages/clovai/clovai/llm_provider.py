"""Low-level provider streaming — prefer clovai.utils for API calls."""

from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass

from clovai.chat import resolve_model, stream_chat
from clovai.client import LlmClient
from clovai.config import LlmSettings


@dataclass(slots=True)
class AgentChatInput:
    """One turn of agent chat (matches DB agent config + conversation history)."""

    system_prompt: str
    model: str
    temperature: float
    max_tokens: int | None
    history: list[tuple[str, str]]
    user_message: str


async def stream_llm(
    chat: AgentChatInput,
    *,
    settings: LlmSettings | None = None,
    client: LlmClient | None = None,
) -> AsyncIterator[str]:
    settings = settings or LlmSettings()
    client = client or LlmClient(settings)
    model = resolve_model(chat.model, settings.default_model)

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
