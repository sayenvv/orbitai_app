from __future__ import annotations

from collections.abc import AsyncIterator

from clovai.client import LlmClient

_OPENAI_MODEL_PREFIXES = ("gpt-", "o1", "o3", "text-", "chatgpt")


def resolve_model(agent_model: str, default_model: str) -> str:
    """Use agent model when it looks like a local tag; otherwise fall back to default."""
    normalized = agent_model.strip()
    if not normalized:
        return default_model
    lower = normalized.lower()
    if any(lower.startswith(prefix) for prefix in _OPENAI_MODEL_PREFIXES):
        return default_model
    return normalized


def build_messages(
    *,
    system_prompt: str,
    history: list[tuple[str, str]],
    user_message: str,
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    if system_prompt.strip():
        messages.append({"role": "system", "content": system_prompt.strip()})
    for role, content in history:
        if not content.strip():
            continue
        message_role = "assistant" if role == "assistant" else "user"
        messages.append({"role": message_role, "content": content})
    messages.append({"role": "user", "content": user_message})
    return messages


async def stream_chat(
    client: LlmClient,
    *,
    model: str,
    system_prompt: str,
    history: list[tuple[str, str]],
    user_message: str,
    temperature: float = 0.7,
    max_tokens: int | None = None,
) -> AsyncIterator[str]:
    messages = build_messages(
        system_prompt=system_prompt,
        history=history,
        user_message=user_message,
    )
    async for token in client.chat_stream(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    ):
        yield token
