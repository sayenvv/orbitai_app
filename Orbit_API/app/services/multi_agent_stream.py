from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.models import Conversation, User
from app.orchestration.multi_agent import get_group_chat_orchestrator
from app.orchestration.runner import get_or_create_conversation, load_conversation_history, save_message
from app.schemas import MultiAgentStartRequest, StreamMessageRequest, TokenUsageResponse
from app.services.agent_registry import AgentRegistry
from app.orchestration.multi_agent import get_orchestration_settings
from app.services.multi_agent_chat import (
    assistant_message_metadata,
    build_orchestration_task,
    prior_turns_for_llm,
    stream_text_chunks,
    turn_from_stream_done,
    _chat_llm_answer,
    _effective_user_message,
    _sync_conversation_orchestration,
)
from orbit_orchestration.domain.message_text import is_safe_stream_token, is_valid_chat_ui_content
from app.services.token_usage import (
    can_consume,
    ensure_current_period,
    estimate_tokens,
    estimate_turn_tokens,
    record_usage,
)
from orbit_orchestration.domain.types import OrchestrationStatus

_SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


def _resolve_agent_uuid(registry: AgentRegistry, agent_slug: str | None) -> UUID | None:
    if not agent_slug:
        return None
    config = registry.get_by_slug(agent_slug)
    return config.agent_id if config else None


def _prepare_conversation(
    db: Session,
    *,
    user: User,
    body: MultiAgentStartRequest,
) -> tuple[Conversation, list[tuple[str, str]], UUID | None]:
    registry = AgentRegistry(db)
    history: list[tuple[str, str]] = []
    conv: Conversation | None = None
    agent_slug: str | None = body.agent_id or None

    if body.conversation_id:
        conv = (
            db.query(Conversation)
            .options(joinedload(Conversation.agent))
            .filter(Conversation.id == body.conversation_id)
            .first()
        )
        if conv:
            if conv.user_id and conv.user_id != user.id:
                raise HTTPException(status_code=403, detail="Forbidden")
            history = load_conversation_history(db, conv.id)
            if not agent_slug and conv.agent:
                agent_slug = conv.agent.slug

    agent_uuid = _resolve_agent_uuid(registry, agent_slug)

    if conv is None:
        conv = get_or_create_conversation(
            db,
            conversation_id=None,
            user_id=user.id,
            agent_id=agent_uuid,
            title=(body.task[:50] if body.task else "New conversation"),
            app_slug=body.app_slug,
            source_id=body.source_id if body.app_slug else None,
        )
    elif body.app_slug or body.source_id:
        changed = False
        if body.app_slug and not conv.app_slug:
            conv.app_slug = body.app_slug
            changed = True
        if body.source_id and not conv.source_id:
            conv.source_id = body.source_id
            changed = True
        if changed:
            db.commit()
            db.refresh(conv)

    source_uuid: UUID | None = body.source_id
    return conv, history, source_uuid


async def stream_chat_orchestration(
    db: Session,
    *,
    conv: Conversation,
    user_message: str,
    history: list[tuple[str, str]],
    source_id: UUID | None,
    user_id: UUID,
) -> AsyncIterator[dict[str, Any]]:
    """Map orchestrator SSE events to chat UI events (conversation_id, token, done)."""
    orchestrator = get_group_chat_orchestrator()
    effective = _effective_user_message(
        db,
        user_message=user_message,
        source_id=source_id,
        user_id=user_id,
    )

    awaiting = (
        conv.orchestration_status == OrchestrationStatus.awaiting_human.value
        and conv.orchestration_session_id
    )

    prior_history = prior_turns_for_llm(history, user_message)
    team_task = build_orchestration_task(effective, prior_history)

    if awaiting:
        event_source = orchestrator.stream_chat_turn(
            user_message=effective,
            prior_history=prior_history,
            team_task=team_task,
            resume_session_id=conv.orchestration_session_id,
        )
    else:
        event_source = orchestrator.stream_chat_turn(
            user_message=effective,
            prior_history=prior_history,
            team_task=team_task,
        )

    token_parts: list[str] = []
    image_results: list[dict[str, Any]] = []
    card_results: list[dict[str, Any]] = []
    conv_id = str(conv.id)

    async for event in event_source:
        etype = event.get("type")

        if etype == "start":
            session_id = event.get("session_id")
            if session_id:
                conv.orchestration_session_id = session_id
            yield {
                "type": "start",
                "conversation_id": conv_id,
                "session_id": session_id,
                "status": event.get("status"),
            }
            continue

        if etype == "meta":
            orch_status = event.get("orchestration_status")
            if orch_status:
                conv.orchestration_status = orch_status
            yield {
                "type": "meta",
                "routing": event.get("routing"),
                "orchestration_status": orch_status,
                "human_prompt": event.get("human_prompt"),
            }
            continue

        if etype == "message":
            continue

        if etype == "images":
            batch = event.get("images")
            if isinstance(batch, list):
                for item in batch:
                    if isinstance(item, dict) and item.get("image_url"):
                        image_results.append(item)
            yield event
            continue

        if etype == "cards":
            batch = event.get("cards")
            if isinstance(batch, list):
                for item in batch:
                    if isinstance(item, dict) and item.get("title"):
                        card_results.append(item)
            yield event
            continue

        if etype == "token":
            content = event.get("content") or ""
            accumulated = "".join(token_parts)
            if not is_safe_stream_token(content, accumulated=accumulated):
                continue
            token_parts.append(content)
            yield {"type": "token", "content": content}
            continue

        if etype == "done":
            turn = turn_from_stream_done(event, streamed_text="".join(token_parts))
            _sync_conversation_orchestration(
                conv,
                status=turn.status,
                session_id=turn.orchestration_session_id,
            )

            if not token_parts and turn.content:
                async for chunk in stream_text_chunks(turn.content):
                    token_parts.append(chunk)
                    yield {"type": "token", "content": chunk}

            yield {
                "type": "done",
                "conversation_id": conv_id,
                "session_id": event.get("session_id"),
                "orchestration_status": turn.status,
                "images": image_results or event.get("images") or turn.images,
                "cards": card_results or event.get("cards") or turn.cards,
            }
            continue

        if etype == "error":
            yield event


def _stream_message_request_to_start(body: StreamMessageRequest) -> MultiAgentStartRequest:
    return MultiAgentStartRequest(
        task=body.message,
        conversation_id=body.conversation_id,
        agent_id=body.agent_id,
        app_slug=body.app_slug,
        source_id=body.source_id,
    )


async def stream_orchestration_events(
    db: Session | None,
    *,
    user: User | None,
    body: MultiAgentStartRequest,
) -> AsyncIterator[dict[str, Any]]:
    if body.conversation_id:
        if db is None or user is None:
            raise HTTPException(status_code=500, detail="Database session required for chat stream")
        conv, _prior, source_id = _prepare_conversation(db, user=user, body=body)

        ensure_current_period(db, user)
        estimated = estimate_tokens(body.task)
        if not can_consume(user, estimated):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Monthly token limit reached. Upgrade your plan to continue chatting.",
            )

        save_message(db, conv.id, "user", body.task)
        conv.updated_at = datetime.now(timezone.utc)
        db.commit()

        # Full thread from DB (includes the message we just saved).
        history = load_conversation_history(db, conv.id)

        full = ""
        streamed_images: list[dict[str, Any]] = []
        streamed_cards: list[dict[str, Any]] = []
        done_event: dict[str, Any] | None = None

        try:
            async for event in stream_chat_orchestration(
                db,
                conv=conv,
                user_message=body.task,
                history=history,
                source_id=source_id,
                user_id=user.id,
            ):
                if event.get("type") == "done":
                    done_event = event
                    continue
                if event.get("type") == "images":
                    batch = event.get("images")
                    if isinstance(batch, list):
                        for item in batch:
                            if isinstance(item, dict) and item.get("image_url"):
                                streamed_images.append(item)
                    yield event
                    continue
                if event.get("type") == "cards":
                    batch = event.get("cards")
                    if isinstance(batch, list):
                        for item in batch:
                            if isinstance(item, dict) and item.get("title"):
                                streamed_cards.append(item)
                    yield event
                    continue
                if event.get("type") == "token":
                    full += event.get("content") or ""
                yield event
        except Exception as exc:
            err_text = f"Multi-agent orchestration failed: {exc}"
            yield {"type": "token", "content": err_text}
            full = err_text
            done_event = {"type": "done", "status": "failed", "error": str(exc)}

        if done_event:
            if streamed_images and not done_event.get("images"):
                done_event = {**done_event, "images": streamed_images}
            if streamed_cards and not done_event.get("cards"):
                done_event = {**done_event, "cards": streamed_cards}

        turn = (
            turn_from_stream_done(done_event, streamed_text=full)
            if done_event
            else turn_from_stream_done(
                {
                    "type": "done",
                    "status": "failed",
                    "result": full,
                    "images": streamed_images,
                    "cards": streamed_cards,
                },
                streamed_text=full,
            )
        )

        if not is_valid_chat_ui_content(turn.content or full) and not streamed_cards:
            prior = prior_turns_for_llm(history, body.task)
            fallback = await _chat_llm_answer(
                body.task,
                prior,
                get_orchestration_settings(),
            )
            if is_valid_chat_ui_content(fallback):
                full = fallback
                turn = turn_from_stream_done(
                    done_event or {"type": "done", "status": "completed"},
                    streamed_text=full,
                )
                async for chunk in stream_text_chunks(full):
                    yield {"type": "token", "content": chunk}

        save_message(
            db,
            conv.id,
            "assistant",
            turn.content or full,
            widget_payload=assistant_message_metadata(turn),
        )
        conv.updated_at = datetime.now(timezone.utc)
        db.commit()

        turn_tokens = estimate_turn_tokens(user_message=body.task, assistant_message=turn.content or full)
        snapshot = record_usage(db, user, turn_tokens)
        yield {
            "type": "done",
            "conversation_id": str(conv.id),
            "orchestration_status": turn.status,
            "images": turn.images or streamed_images or None,
            "cards": turn.cards or streamed_cards or None,
            "usage": TokenUsageResponse(
                tokens_used=snapshot.tokens_used,
                tokens_limit=snapshot.tokens_limit,
                tokens_remaining=snapshot.tokens_remaining,
                usage_percent=snapshot.usage_percent,
                limit_reached=snapshot.limit_reached,
            ).model_dump(),
        }
        return

    orchestrator = get_group_chat_orchestrator()

    async def raw_events():
        try:
            async for event in orchestrator.stream_start(body.task):
                yield event
        except Exception as exc:
            yield {"type": "error", "detail": str(exc)}

    async for event in raw_events():
        yield event


def sse_response(event_source: AsyncIterator[dict[str, Any]]) -> StreamingResponse:
    async def generator():
        async for event in event_source:
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


def chat_streaming_response(
    db: Session,
    user: User,
    body: StreamMessageRequest,
    request: Request,
) -> StreamingResponse:
    enforce_rate_limit(
        request,
        scope="chat-stream",
        limit=settings.rate_limit_chat_stream_per_minute,
    )
    start_body = _stream_message_request_to_start(body)
    return sse_response(stream_orchestration_events(db, user=user, body=start_body))


def multi_agent_streaming_response(
    db: Session,
    user: User,
    body: MultiAgentStartRequest,
    request: Request | None = None,
) -> StreamingResponse:
    if body.conversation_id and request is not None:
        enforce_rate_limit(
            request,
            scope="chat-stream",
            limit=settings.rate_limit_chat_stream_per_minute,
        )

    return sse_response(stream_orchestration_events(db, user=user, body=body))
