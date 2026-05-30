"""
High-level helpers for the Clovai API.

Usage in FastAPI routes or orchestration::

    from clovai.utils import agent_chat_input, get_status, list_installed_models, stream_agent_chat

    status = await get_status()
    models = await list_installed_models()

    chat = agent_chat_input(
        system_prompt=config.system_prompt,
        model=config.model,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        history=history,
        user_message=user_message,
    )
    async for token in stream_agent_chat(chat):
        ...
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass

from clovai.client import LlmClient, LlmError
from clovai.config import LlmSettings
from clovai.llm_provider import AgentChatInput, stream_llm
from clovai.models import LlmModel


@dataclass(slots=True)
class LlmProviderStatus:
    available: bool
    base_url: str
    default_model: str


def get_settings(
    *,
    base_url: str | None = None,
    default_model: str | None = None,
    timeout: float | None = None,
) -> LlmSettings:
    """Build settings from env (OLLAMA_*) with optional overrides."""
    overrides: dict[str, str | float] = {}
    if base_url is not None:
        overrides["base_url"] = base_url
    if default_model is not None:
        overrides["default_model"] = default_model
    if timeout is not None:
        overrides["timeout"] = timeout
    return LlmSettings(**overrides)


def get_client(settings: LlmSettings | None = None) -> LlmClient:
    return LlmClient(settings or get_settings())


async def get_status(settings: LlmSettings | None = None) -> LlmProviderStatus:
    """Check whether the local LLM server is reachable."""
    settings = settings or get_settings()
    client = get_client(settings)
    return LlmProviderStatus(
        available=await client.is_available(),
        base_url=settings.base_url,
        default_model=settings.default_model,
    )


async def list_installed_models(settings: LlmSettings | None = None) -> list[LlmModel]:
    """Return models from the local LLM server. Raises LlmError if unavailable."""
    settings = settings or get_settings()
    client = get_client(settings)
    if not await client.is_available():
        raise LlmError(
            f"Local LLM not reachable at {settings.base_url_normalized}. "
            f"Start it with: ollama serve"
        )
    return await client.list_models()


def agent_chat_input(
    *,
    system_prompt: str,
    model: str,
    temperature: float,
    max_tokens: int | None,
    history: list[tuple[str, str]],
    user_message: str,
) -> AgentChatInput:
    """Build one agent chat turn from API / DB fields."""
    return AgentChatInput(
        system_prompt=system_prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        history=history,
        user_message=user_message,
    )


async def stream_agent_chat(
    chat: AgentChatInput,
    *,
    settings: LlmSettings | None = None,
) -> AsyncIterator[str]:
    """
    Stream tokens for one agent chat turn.

    Checks LLM availability first; raises LlmError if unavailable.
    """
    settings = settings or get_settings()
    client = get_client(settings)
    if not await client.is_available():
        raise LlmError(
            f"Local LLM not reachable at {settings.base_url_normalized}. "
            f"Run: ollama serve && ollama pull {settings.default_model}"
        )
    async for token in stream_llm(chat, settings=settings, client=client):
        yield token
