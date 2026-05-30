"""
High-level helpers for Orbit API.

Usage in FastAPI routes or orchestration::

    from orbit_ollama.utils import agent_chat_input, get_status, list_installed_models, stream_agent_chat

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

from orbit_ollama.client import OllamaClient, OllamaError
from orbit_ollama.config import OllamaSettings
from orbit_ollama.llm_provider import AgentChatInput, stream_ollama
from orbit_ollama.models import OllamaModel


@dataclass(slots=True)
class OllamaStatus:
    available: bool
    base_url: str
    default_model: str


def get_settings(
    *,
    base_url: str | None = None,
    default_model: str | None = None,
    timeout: float | None = None,
) -> OllamaSettings:
    """Build settings from env (OLLAMA_*) with optional overrides."""
    overrides: dict[str, str | float] = {}
    if base_url is not None:
        overrides["base_url"] = base_url
    if default_model is not None:
        overrides["default_model"] = default_model
    if timeout is not None:
        overrides["timeout"] = timeout
    return OllamaSettings(**overrides)


def get_client(settings: OllamaSettings | None = None) -> OllamaClient:
    return OllamaClient(settings or get_settings())


async def get_status(settings: OllamaSettings | None = None) -> OllamaStatus:
    """Check whether Ollama is reachable."""
    settings = settings or get_settings()
    client = get_client(settings)
    return OllamaStatus(
        available=await client.is_available(),
        base_url=settings.base_url,
        default_model=settings.default_model,
    )


async def list_installed_models(settings: OllamaSettings | None = None) -> list[OllamaModel]:
    """Return models from Ollama. Raises OllamaError if the server is down."""
    settings = settings or get_settings()
    client = get_client(settings)
    if not await client.is_available():
        raise OllamaError(
            f"Ollama not reachable at {settings.base_url_normalized}. "
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
    settings: OllamaSettings | None = None,
) -> AsyncIterator[str]:
    """
    Stream tokens for one agent chat turn.

    Checks Ollama availability first; raises OllamaError if unavailable.
    """
    settings = settings or get_settings()
    client = get_client(settings)
    if not await client.is_available():
        raise OllamaError(
            f"Ollama not reachable at {settings.base_url_normalized}. "
            f"Run: ollama serve && ollama pull {settings.default_model}"
        )
    async for token in stream_ollama(chat, settings=settings, client=client):
        yield token
