from typing import AsyncIterator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI, ChatOpenAI
from orbit_ollama import OllamaError, OllamaSettings, agent_chat_input, get_settings, get_status, stream_agent_chat
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Conversation, Message
from app.services.agent_registry import AgentRegistry, AgentRuntimeConfig
from app.services.plan_ai_stack import ChatStackConfig, PlanAiStack, get_plan_ai_stack


def _stub_stream(text: str) -> AsyncIterator[str]:
    async def gen():
        for word in text.split():
            yield word + " "

    return gen()


async def _stream_openai(
    config: AgentRuntimeConfig,
    *,
    history: list[tuple[str, str]],
    user_message: str,
    chat_stack: ChatStackConfig,
) -> AsyncIterator[str]:
    llm = ChatOpenAI(
        model=chat_stack.model or config.model,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        api_key=settings.openai_api_key,
        streaming=True,
    )

    messages = [SystemMessage(content=config.system_prompt)]
    for role, content in history:
        if role == "user":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))
    messages.append(HumanMessage(content=user_message))

    async for chunk in llm.astream(messages):
        if chunk.content:
            text = chunk.content if isinstance(chunk.content, str) else str(chunk.content)
            yield text


async def _stream_azure(
    config: AgentRuntimeConfig,
    *,
    history: list[tuple[str, str]],
    user_message: str,
    chat_stack: ChatStackConfig,
) -> AsyncIterator[str]:
    deployment = (chat_stack.deployment or chat_stack.model).strip()
    if not settings.azure_openai_endpoint.strip() or not settings.azure_openai_api_key.strip():
        async for chunk in _stub_stream(
            f"[{config.name}] Azure OpenAI is not configured on the server "
            f"(set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY). "
            f"You asked: {user_message}"
        ):
            yield chunk
        return

    llm = AzureChatOpenAI(
        azure_deployment=deployment,
        azure_endpoint=settings.azure_openai_endpoint.strip(),
        api_key=settings.azure_openai_api_key.strip(),
        api_version=settings.azure_openai_api_version,
        model=chat_stack.model,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        streaming=True,
    )

    messages = [SystemMessage(content=config.system_prompt)]
    for role, content in history:
        if role == "user":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))
    messages.append(HumanMessage(content=user_message))

    async for chunk in llm.astream(messages):
        if chunk.content:
            text = chunk.content if isinstance(chunk.content, str) else str(chunk.content)
            yield text


def _ollama_settings(chat_stack: ChatStackConfig) -> OllamaSettings:
    return get_settings(
        base_url=settings.ollama_base_url,
        default_model=chat_stack.model or settings.ollama_default_model,
        timeout=settings.ollama_timeout,
    )


async def _ollama_available(chat_stack: ChatStackConfig) -> bool:
    status = await get_status(_ollama_settings(chat_stack))
    return status.available


async def _stream_ollama(
    config: AgentRuntimeConfig,
    *,
    history: list[tuple[str, str]],
    user_message: str,
    chat_stack: ChatStackConfig,
) -> AsyncIterator[str]:
    chat = agent_chat_input(
        system_prompt=config.system_prompt,
        model=chat_stack.model or config.model,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        history=history,
        user_message=user_message,
    )
    try:
        async for token in stream_agent_chat(chat, settings=_ollama_settings(chat_stack)):
            yield token
    except OllamaError as exc:
        async for chunk in _stub_stream(f"[{config.name}] {exc}. You asked: {user_message}"):
            yield chunk


def _resolve_plan_stack(db: Session, user_plan: str | None) -> PlanAiStack:
    if user_plan:
        return get_plan_ai_stack(db, user_plan)
    if settings.use_ollama:
        from app.services.plan_ai_stack import default_local_stack

        return default_local_stack()
    from app.services.plan_ai_stack import default_azure_stack

    if settings.azure_openai_api_key.strip() and settings.azure_openai_endpoint.strip():
        return default_azure_stack()
    from app.services.plan_ai_stack import default_local_stack

    return default_local_stack()


async def stream_agent_response(
    db: Session,
    *,
    user_message: str,
    agent_slug: str | None,
    history: list[tuple[str, str]],
    source_id=None,
    user_id=None,
    user_plan: str | None = None,
) -> AsyncIterator[str]:
    from uuid import UUID

    from app.services.rag.retrieval import build_rag_prompt, retrieve_context

    effective_message = user_message
    if source_id and user_id:
        context = retrieve_context(
            db,
            document_id=source_id if isinstance(source_id, UUID) else UUID(str(source_id)),
            user_id=user_id if isinstance(user_id, UUID) else UUID(str(user_id)),
            query=user_message,
        )
        if context:
            effective_message = build_rag_prompt(context=context, user_message=user_message)

    registry = AgentRegistry(db)
    config: AgentRuntimeConfig | None = None
    if agent_slug:
        config = registry.get_by_slug(agent_slug)
    if not config:
        config = registry.get_default()

    if not config:
        async for chunk in _stub_stream(
            "No active agent is configured. Run the seed script and publish an agent."
        ):
            yield chunk
        return

    stack = _resolve_plan_stack(db, user_plan)
    chat_stack = stack.chat

    if chat_stack.provider == "azure_openai":
        async for token in _stream_azure(
            config, history=history, user_message=effective_message, chat_stack=chat_stack
        ):
            yield token
        return

    if chat_stack.provider == "openai":
        if not settings.openai_api_key.strip():
            async for chunk in _stub_stream(
                f"[{config.name}] OpenAI API key is not configured. You asked: {effective_message}"
            ):
                yield chunk
            return
        async for token in _stream_openai(
            config, history=history, user_message=effective_message, chat_stack=chat_stack
        ):
            yield token
        return

    if await _ollama_available(chat_stack):
        async for token in _stream_ollama(
            config, history=history, user_message=effective_message, chat_stack=chat_stack
        ):
            yield token
        return

    async for chunk in _stub_stream(
        f"[{config.name}] Ollama is not running. Start it with "
        f"ollama serve && ollama pull {chat_stack.model or settings.ollama_default_model}. "
        f"You asked: {effective_message}"
    ):
        yield chunk


def load_conversation_history(db: Session, conversation_id) -> list[tuple[str, str]]:
    rows = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .all()
    )
    return [(m.role, m.content) for m in rows]


def save_message(db: Session, conversation_id, role: str, content: str) -> Message:
    msg = Message(conversation_id=conversation_id, role=role, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_or_create_conversation(
    db: Session,
    *,
    conversation_id,
    user_id,
    agent_id,
    title: str,
) -> Conversation:
    if conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            return conv

    conv = Conversation(user_id=user_id, agent_id=agent_id, title=title[:512])
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv
