import json
from typing import AsyncIterator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Conversation, Message
from app.services.agent_registry import AgentRegistry, AgentRuntimeConfig


def _stub_stream(text: str) -> AsyncIterator[str]:
    async def gen():
        for word in text.split():
            yield word + " "

    return gen()


async def stream_agent_response(
    db: Session,
    *,
    user_message: str,
    agent_slug: str | None,
    history: list[tuple[str, str]],
) -> AsyncIterator[str]:
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

    if not settings.openai_api_key:
        async for chunk in _stub_stream(
            f"[{config.name}] Dev mode: set OPENAI_API_KEY for live responses. "
            f"You asked: {user_message}"
        ):
            yield chunk
        return

    llm = ChatOpenAI(
        model=config.model,
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
