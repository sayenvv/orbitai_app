from typing import AsyncIterator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from orbit_orchestration.config import OrchestrationSettings
from orbit_orchestration.langchain.llm_factory import create_chat_model

_SYSTEM = (
    "You are a helpful Orbit AI assistant. Answer clearly and conversationally. "
    "Do not mention internal agents, routing, or tools unless the user asks.\n\n"
    "Formatting rules:\n"
    "- Use GitHub-flavored Markdown.\n"
    "- For any code (Python, JavaScript, TypeScript, CSS, HTML, JSON, YAML, SQL, shell), use fenced "
    "blocks with a language tag (e.g. ```python, ```css, ```html, ```json, ```typescript, ```bash). "
    "Never paste multi-line code as plain text.\n"
    "- For short inline identifiers use single backticks."
)


def _build_messages(
    user_message: str,
    history: list[tuple[str, str]],
) -> list:
    messages: list = [SystemMessage(content=_SYSTEM)]
    for role, content in history[-12:]:
        if role == "user":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))
    messages.append(HumanMessage(content=user_message))
    return messages


def _chunk_content(content: object) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    return str(content)


async def direct_chat_reply(
    user_message: str,
    history: list[tuple[str, str]],
    settings: OrchestrationSettings | None = None,
) -> str:
    llm = create_chat_model(settings)
    response = await llm.ainvoke(_build_messages(user_message, history))
    return _chunk_content(response.content)


async def direct_chat_stream(
    user_message: str,
    history: list[tuple[str, str]],
    settings: OrchestrationSettings | None = None,
) -> AsyncIterator[str]:
    llm = create_chat_model(settings)
    async for chunk in llm.astream(_build_messages(user_message, history)):
        text = _chunk_content(chunk.content)
        if text:
            yield text
