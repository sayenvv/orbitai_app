from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncIterator
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Conversation, Message
from app.orchestration.multi_agent import get_group_chat_orchestrator, get_orchestration_settings
from orbit_orchestration.domain.message_text import (
    is_valid_chat_ui_content,
    sanitize_for_chat_ui,
)
from orbit_orchestration.domain.routing import TaskRouting, is_general_chat
from orbit_orchestration.domain.types import OrchestrationRun, OrchestrationStatus
from orbit_orchestration.langchain.direct_chat import direct_chat_reply
from orbit_orchestration.langchain.intent_router import analyze_task_intent


@dataclass
class ChatTurnResult:
    """Shape expected by POST /api/chat/message/stream (UI markdown in `content`)."""

    content: str
    routing: TaskRouting | None
    status: str
    human_prompt: str | None
    orchestration_session_id: str | None
    error: str | None = None
    images: list[dict[str, str]] | None = None
    cards: list[dict[str, str]] | None = None


def task_routing_from_payload(raw: dict | None) -> TaskRouting | None:
    if not raw or not isinstance(raw, dict):
        return None
    return TaskRouting(
        primary_agent=raw.get("primary_agent", "assistant"),  # type: ignore[arg-type]
        selected_agents=list(raw.get("selected_agents") or []),
        intent=str(raw.get("intent", "")),
        topics=list(raw.get("topics") or []),
        reasoning=str(raw.get("reasoning", "")),
    )


def turn_from_stream_done(
    done: dict,
    *,
    streamed_text: str,
) -> ChatTurnResult:
    """Build chat turn metadata from an orchestrator ``done`` SSE event."""
    routing = task_routing_from_payload(done.get("routing"))
    status = str(done.get("status") or OrchestrationStatus.completed.value)
    human_prompt = done.get("human_prompt")
    session_id = done.get("session_id")

    from orbit_orchestration.domain.types import OrchestrationMessage, OrchestrationRun

    messages = [
        OrchestrationMessage(source=m.get("source", "assistant"), content=m.get("content", ""))
        for m in (done.get("messages") or [])
        if isinstance(m, dict)
    ]
    run: OrchestrationRun | None = None
    if messages or done.get("result"):
        try:
            run_status = OrchestrationStatus(status)
        except ValueError:
            run_status = OrchestrationStatus.completed
        run = OrchestrationRun(
            session_id=str(session_id or ""),
            status=run_status,
            task=str(done.get("task") or ""),
            messages=messages,
            routing=routing,
            human_prompt=human_prompt,
            result=done.get("result"),
            error=done.get("error"),
        )

    content = sanitize_for_chat_ui(streamed_text) or sanitize_for_chat_ui(done.get("result") or "")
    if routing and run:
        content, status, human_prompt, session_id = _finalize_turn_status(
            routing=routing,
            run=run,
            llm_answer=content,
        )
    elif not content:
        content = "Sorry, I could not generate a response. Please try again."
        status = OrchestrationStatus.failed.value

    images_raw = done.get("images")
    images = (
        [item for item in images_raw if isinstance(item, dict)]
        if isinstance(images_raw, list)
        else None
    )
    cards_raw = done.get("cards")
    cards = (
        [item for item in cards_raw if isinstance(item, dict)]
        if isinstance(cards_raw, list)
        else None
    )

    return ChatTurnResult(
        content=content,
        routing=routing,
        status=status,
        human_prompt=human_prompt,
        orchestration_session_id=session_id,
        error=done.get("error"),
        images=images,
        cards=cards,
    )


def routing_payload_for_stream(routing: TaskRouting | None) -> dict | None:
    if routing is None:
        return None
    return {
        "primary_agent": routing.primary_agent,
        "selected_agents": list(routing.selected_agents),
        "intent": routing.intent,
        "topics": list(routing.topics),
        "reasoning": routing.reasoning,
    }


async def _chat_llm_answer(
    effective: str,
    history: list[tuple[str, str]],
    settings,
) -> str:
    return sanitize_for_chat_ui(await direct_chat_reply(effective, history, settings))


def _resolve_ui_content(
    *,
    routing: TaskRouting,
    run: OrchestrationRun | None,
    llm_answer: str,
    status: str,
    human_prompt: str | None,
) -> str:
    _ = (routing, status, human_prompt)
    if is_valid_chat_ui_content(llm_answer):
        return llm_answer
    if run:
        from_orchestrator = sanitize_for_chat_ui(run.result or "")
        if is_valid_chat_ui_content(from_orchestrator):
            return from_orchestrator
    return llm_answer or "Sorry, I could not generate a response. Please try again."


def _clear_awaiting_human(conv: Conversation) -> None:
    conv.orchestration_session_id = None
    conv.orchestration_status = OrchestrationStatus.completed.value


def _finalize_turn_status(
    *,
    routing: TaskRouting,
    run: OrchestrationRun | None,
    llm_answer: str,
) -> tuple[str, str, str | None, str | None]:
    status = (
        run.status.value
        if run and hasattr(run.status, "value")
        else (str(run.status) if run else OrchestrationStatus.completed.value)
    )
    session_id = run.session_id if run else None
    human_prompt = run.human_prompt if run else None

    content = _resolve_ui_content(
        routing=routing,
        run=run,
        llm_answer=llm_answer,
        status=status,
        human_prompt=human_prompt,
    )

    if not is_valid_chat_ui_content(content):
        content = llm_answer or "Sorry, I could not generate a response. Please try again."
        status = OrchestrationStatus.completed.value
        session_id = None
        human_prompt = None

    return content, status, human_prompt, session_id


CHAT_HISTORY_LIMIT = 12


def prior_turns_for_llm(
    history: list[tuple[str, str]],
    current_user_message: str,
) -> list[tuple[str, str]]:
    """DB history may include the just-saved user message as the last row — exclude it."""
    if (
        history
        and history[-1][0] == "user"
        and history[-1][1].strip() == current_user_message.strip()
    ):
        return history[:-1]
    return list(history)


def build_orchestration_task(
    user_message: str,
    history: list[tuple[str, str]],
    *,
    max_messages: int = CHAT_HISTORY_LIMIT,
) -> str:
    if not history:
        return user_message
    lines: list[str] = []
    for role, content in history[-max_messages:]:
        label = "USER" if role == "user" else "ASSISTANT"
        lines.append(f"{label}: {content[:4000]}")
    lines.append(f"USER: {user_message}")
    return (
        "Continue this conversation. Use the transcript for context.\n\n"
        + "\n\n".join(lines)
    )


def _effective_user_message(
    db: Session,
    *,
    user_message: str,
    source_id: UUID | None,
    user_id: UUID,
) -> str:
    if not source_id:
        return user_message
    from app.services.rag.retrieval import build_rag_prompt, retrieve_context

    context = retrieve_context(
        db,
        document_id=source_id,
        user_id=user_id,
        query=user_message,
    )
    if context:
        return build_rag_prompt(context=context, user_message=user_message)
    return user_message


def _sync_conversation_orchestration(
    conv: Conversation,
    *,
    status: str,
    session_id: str | None,
) -> None:
    conv.orchestration_session_id = session_id
    conv.orchestration_status = status


async def run_chat_turn(
    db: Session,
    *,
    conv: Conversation,
    user_message: str,
    history: list[tuple[str, str]],
    source_id: UUID | None,
    user_id: UUID,
) -> ChatTurnResult:
    settings = get_orchestration_settings()
    orchestrator = get_group_chat_orchestrator()
    effective = _effective_user_message(
        db,
        user_message=user_message,
        source_id=source_id,
        user_id=user_id,
    )

    awaiting = conv.orchestration_status == OrchestrationStatus.awaiting_human.value
    routing = await analyze_task_intent(effective, settings)
    llm_answer = await _chat_llm_answer(effective, history, settings)
    run: OrchestrationRun | None = None

    if is_general_chat(routing):
        if awaiting:
            _clear_awaiting_human(conv)
        content = _resolve_ui_content(
            routing=routing,
            run=None,
            llm_answer=llm_answer,
            status=OrchestrationStatus.completed.value,
            human_prompt=None,
        )
        _sync_conversation_orchestration(
            conv,
            status=OrchestrationStatus.completed.value,
            session_id=None,
        )
        return ChatTurnResult(
            content=content,
            routing=routing,
            status=OrchestrationStatus.completed.value,
            human_prompt=None,
            orchestration_session_id=None,
        )

    if awaiting:
        _clear_awaiting_human(conv)
    run = await orchestrator.start(build_orchestration_task(effective, history))

    content, status, human_prompt, session_id = _finalize_turn_status(
        routing=routing,
        run=run,
        llm_answer=llm_answer,
    )
    _sync_conversation_orchestration(conv, status=status, session_id=session_id)

    return ChatTurnResult(
        content=content,
        routing=(run.routing if run else None) or routing,
        status=status,
        human_prompt=human_prompt,
        orchestration_session_id=session_id,
        error=run.error if run else None,
    )


async def stream_text_chunks(text: str, *, chunk_words: int = 3) -> AsyncIterator[str]:
    """Stream only UI-safe markdown (caller must sanitize first)."""
    safe = sanitize_for_chat_ui(text)
    words = safe.split()
    if not words:
        yield ""
        return
    for i in range(0, len(words), chunk_words):
        chunk = " ".join(words[i : i + chunk_words])
        suffix = " " if i + chunk_words < len(words) else ""
        yield chunk + suffix


def assistant_message_metadata(turn: ChatTurnResult) -> dict | None:
    meta: dict = {"orchestration_status": turn.status}
    if turn.orchestration_session_id:
        meta["orchestration_session_id"] = turn.orchestration_session_id
    routing = routing_payload_for_stream(turn.routing)
    if routing:
        meta["routing"] = routing
    if turn.human_prompt and turn.status == OrchestrationStatus.awaiting_human.value:
        meta["human_prompt"] = turn.human_prompt
    if turn.images:
        meta["images"] = turn.images
    if turn.cards:
        meta["cards"] = turn.cards
    return meta


def metadata_from_message(msg: Message):
    from app.schemas import (
        AdaptiveCardResponse,
        MessageMetadataResponse,
        MultiAgentRoutingResponse,
        WebSearchImageResponse,
    )

    payload = msg.widget_payload
    if not payload or not isinstance(payload, dict):
        return None

    routing_raw = payload.get("routing")
    routing = None
    if isinstance(routing_raw, dict):
        routing = MultiAgentRoutingResponse(
            primary_agent=str(routing_raw.get("primary_agent", "")),
            selected_agents=list(routing_raw.get("selected_agents") or []),
            intent=str(routing_raw.get("intent", "")),
            topics=list(routing_raw.get("topics") or []),
            reasoning=str(routing_raw.get("reasoning", "")),
        )

    images_raw = payload.get("images")
    images: list[WebSearchImageResponse] = []
    if isinstance(images_raw, list):
        for row in images_raw:
            if not isinstance(row, dict):
                continue
            image_url = str(row.get("image_url") or "").strip()
            if not image_url:
                continue
            images.append(
                WebSearchImageResponse(
                    image_url=image_url,
                    thumbnail_url=row.get("thumbnail_url"),
                    page_url=row.get("page_url"),
                    title=row.get("title"),
                    alt=row.get("alt"),
                    source=row.get("source"),
                )
            )

    cards_raw = payload.get("cards")
    cards: list[AdaptiveCardResponse] = []
    if isinstance(cards_raw, list):
        for row in cards_raw:
            if not isinstance(row, dict):
                continue
            card_id = str(row.get("id") or "").strip()
            title = str(row.get("title") or "").strip()
            if not card_id or not title:
                continue
            cards.append(
                AdaptiveCardResponse(
                    type=str(row.get("type") or "web_result"),
                    id=card_id,
                    title=title,
                    subtitle=row.get("subtitle"),
                    description=row.get("description"),
                    image_url=row.get("image_url"),
                    thumbnail_url=row.get("thumbnail_url"),
                    url=row.get("url"),
                    address=row.get("address"),
                    rating=row.get("rating"),
                    price=row.get("price"),
                    phone=row.get("phone"),
                    email=row.get("email"),
                    company=row.get("company"),
                    salary=row.get("salary"),
                    experience_level=row.get("experience_level"),
                    source=row.get("source"),
                    badges=list(row.get("badges") or []),
                )
            )

    meta = MessageMetadataResponse(
        routing=routing,
        orchestration_status=payload.get("orchestration_status"),
        human_prompt=payload.get("human_prompt"),
        images=images,
        cards=cards,
    )
    if (
        meta.routing is None
        and meta.orchestration_status is None
        and meta.human_prompt is None
        and not meta.images
        and not meta.cards
    ):
        return None
    return meta
