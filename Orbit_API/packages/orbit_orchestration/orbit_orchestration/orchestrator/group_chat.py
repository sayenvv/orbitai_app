from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from autogen_agentchat.messages import HandoffMessage

from orbit_orchestration.autogen.group_chat_team import build_group_chat_team
from orbit_orchestration.autogen.model_client import create_model_client
from orbit_orchestration.config import OrchestrationSettings, get_orchestration_settings
from orbit_orchestration.domain.constants import HITL_PAUSE_SENTINEL
from orbit_orchestration.domain.message_text import extract_display_text, is_noise_content, sanitize_for_chat_ui
from orbit_orchestration.domain.routing import TaskRouting, is_general_chat, requires_human_in_loop
from orbit_orchestration.domain.session import OrchestrationSession, SessionStore
from orbit_orchestration.domain.types import OrchestrationMessage, OrchestrationRun, OrchestrationStatus
from orbit_orchestration.langchain.direct_chat import direct_chat_reply, direct_chat_stream
from orbit_orchestration.langchain.image_hitl import build_image_hitl_prompt, format_image_hitl_user_message
from orbit_orchestration.langchain.intent_router import analyze_task_intent
from orbit_orchestration.orchestrator.streaming import (
    done_event,
    is_completed,
    message_event,
    meta_event,
    start_event,
    status_value,
    stream_display_text,
)


def _session_to_run(session: OrchestrationSession) -> OrchestrationRun:
    return OrchestrationRun(
        session_id=session.session_id,
        status=session.status,
        task=session.task,
        messages=list(session.messages),
        routing=session.routing,
        human_prompt=session.human_prompt,
        result=session.result,
        error=session.error,
    )


def _apply_handoff_for_human(session: OrchestrationSession, message) -> None:
    if not requires_human_in_loop(session.routing):
        return
    if isinstance(message, HandoffMessage) and message.target == "human":
        session.status = OrchestrationStatus.awaiting_human
        content = message.content if isinstance(message.content, str) else str(message.content)
        session.human_prompt = content.strip() or session.human_prompt


def _extract_messages_from_team_result(
    session: OrchestrationSession,
    task_result,
) -> list[OrchestrationMessage]:
    extracted: list[OrchestrationMessage] = []
    if task_result is None:
        return extracted

    messages = getattr(task_result, "messages", None) or []
    for msg in messages:
        _apply_handoff_for_human(session, msg)
        source = getattr(msg, "source", None) or "unknown"
        content = ""
        if hasattr(msg, "content"):
            if isinstance(msg.content, str):
                content = msg.content
            else:
                content = str(msg.content)
        cleaned = extract_display_text(content.strip())
        if cleaned and cleaned != HITL_PAUSE_SENTINEL and not is_noise_content(cleaned):
            agent_name = (
                source
                if source in ("human", "summarizer", "image_generator", "assistant")
                else "assistant"
            )
            extracted.append(OrchestrationMessage(source=agent_name, content=cleaned))
    return extracted


def _final_text(messages: list[OrchestrationMessage]) -> str:
    for msg in reversed(messages):
        if msg.source in ("assistant", "summarizer", "image_generator"):
            cleaned = extract_display_text(msg.content)
            if cleaned and not is_noise_content(cleaned):
                return cleaned
    return ""


def _hitl_runtime_error(exc: RuntimeError) -> bool:
    return "Failed to get user input" in str(exc)


def _task_with_routing(task: str, routing: TaskRouting | None) -> str:
    if routing is None:
        return task
    return routing.to_task_prefix() + task


class GroupChatOrchestrator:
    """Coordinates AutoGen group chat with LangChain-backed specialist agents."""

    def __init__(
        self,
        *,
        settings: OrchestrationSettings | None = None,
        store: SessionStore | None = None,
    ) -> None:
        self._settings = settings or get_orchestration_settings()
        self._store = store or SessionStore()

    async def _ensure_routing(self, session: OrchestrationSession) -> TaskRouting:
        if session.routing is not None:
            return session.routing
        session.routing = await analyze_task_intent(session.task, self._settings)
        return session.routing

    async def _maybe_gate_image_hitl(
        self,
        session: OrchestrationSession,
        user_message: str,
        prior_history: list[tuple[str, str]],
    ) -> bool:
        """Pause with clarifying questions before the image team runs."""
        routing = await self._ensure_routing(session)
        if not requires_human_in_loop(routing):
            return False
        if session.status == OrchestrationStatus.awaiting_human:
            return False

        clarification = await build_image_hitl_prompt(
            user_message,
            prior_history,
            self._settings,
        )
        display = sanitize_for_chat_ui(
            format_image_hitl_user_message(user_message, clarification),
        )
        session.status = OrchestrationStatus.awaiting_human
        session.human_prompt = clarification
        session.result = display
        session.messages.append(OrchestrationMessage(source="assistant", content=display))
        return True

    async def _run_direct_assistant(self, session: OrchestrationSession, task: str) -> None:
        """General chat — single LLM reply (SelectorGroupChat needs 2+ participants)."""
        session.status = OrchestrationStatus.running
        try:
            text = sanitize_for_chat_ui(
                await direct_chat_reply(task, [], self._settings),
            )
            if not text:
                text = "Sorry, I could not generate a response. Please try again."
            session.messages.append(OrchestrationMessage(source="assistant", content=text))
            session.status = OrchestrationStatus.completed
            session.result = text
            session.human_prompt = None
        except Exception as exc:
            session.status = OrchestrationStatus.failed
            session.error = str(exc)

    async def _execute_team(
        self,
        session: OrchestrationSession,
        task: str,
        *,
        prior_history: list[tuple[str, str]] | None = None,
    ) -> None:
        session.status = OrchestrationStatus.running
        try:
            routing = await self._ensure_routing(session)
            if is_general_chat(routing):
                await self._run_direct_assistant(session, task)
                return

            if (
                requires_human_in_loop(routing)
                and not task.strip().startswith("Human response:")
            ):
                if await self._maybe_gate_image_hitl(
                    session,
                    session.task,
                    prior_history or [],
                ):
                    return

            model_client = create_model_client(self._settings)
            team = build_group_chat_team(
                session,
                model_client,
                self._settings,
                routing=routing,
            )
            result = await team.run(task=_task_with_routing(task, routing))
            session.messages.extend(_extract_messages_from_team_result(session, result))
            if (
                session.status == OrchestrationStatus.awaiting_human
                and not requires_human_in_loop(session.routing)
            ):
                session.status = OrchestrationStatus.completed
                session.human_prompt = None
            if session.status != OrchestrationStatus.awaiting_human:
                session.status = OrchestrationStatus.completed
                session.result = _final_text(session.messages)
        except RuntimeError as exc:
            if _hitl_runtime_error(exc) and session.status != OrchestrationStatus.awaiting_human:
                session.status = OrchestrationStatus.awaiting_human
                session.human_prompt = session.human_prompt or "Human input is required to continue."
            else:
                session.status = OrchestrationStatus.failed
                session.error = str(exc)
        except Exception as exc:
            session.status = OrchestrationStatus.failed
            session.error = str(exc)

    async def start(self, task: str) -> OrchestrationRun:
        session = self._store.create(task)
        session.routing = await analyze_task_intent(task, self._settings)
        await self._execute_team(session, task)
        return _session_to_run(session)

    async def resume(self, session_id: str, human_input: str) -> OrchestrationRun:
        session = self._store.get(session_id)
        if not session:
            raise LookupError(f"Session not found: {session_id}")
        if session.status != OrchestrationStatus.awaiting_human:
            raise ValueError("Session is not waiting for human input.")

        session.pending_human_input = human_input.strip()
        session.human_prompt = None

        continuation = (
            f"Human response: {human_input.strip()}\n"
            "Continue the workflow. If image work is done, reply TERMINATE."
        )
        await self._execute_team(session, continuation)
        return _session_to_run(session)

    def get_session(self, session_id: str) -> OrchestrationRun | None:
        session = self._store.get(session_id)
        return _session_to_run(session) if session else None

    async def _emit_team_stream(
        self,
        session: OrchestrationSession,
        *,
        since: int = 0,
    ) -> AsyncIterator[dict[str, Any]]:
        for msg in session.messages[since:]:
            yield message_event(msg)

        if status_value(session) == OrchestrationStatus.awaiting_human.value:
            display = session.result or _final_text(session.messages)
            if display:
                async for event in stream_display_text(display):
                    yield event
            return

        if is_completed(session):
            display = session.result or _final_text(session.messages)
            if display:
                async for event in stream_display_text(display):
                    yield event

    async def _stream_direct_assistant(
        self,
        session: OrchestrationSession,
        user_message: str,
        prior_history: list[tuple[str, str]],
    ) -> AsyncIterator[dict[str, Any]]:
        full = ""
        async for token in direct_chat_stream(
            user_message,
            prior_history,
            self._settings,
        ):
            full += token
            yield {"type": "token", "content": token}

        text = sanitize_for_chat_ui(full)
        if not text:
            text = "Sorry, I could not generate a response. Please try again."
        session.messages.append(OrchestrationMessage(source="assistant", content=text))
        session.status = OrchestrationStatus.completed
        session.result = text
        session.human_prompt = None

    async def stream_start(self, task: str) -> AsyncIterator[dict[str, Any]]:
        session = self._store.create(task)
        session.status = OrchestrationStatus.running
        session.routing = await analyze_task_intent(task, self._settings)

        yield start_event(session)
        yield meta_event(session)

        try:
            if is_general_chat(session.routing):
                async for event in self._stream_direct_assistant(session, task, []):
                    yield event
            else:
                await self._execute_team(session, task)
                async for event in self._emit_team_stream(session):
                    yield event
        except Exception as exc:
            session.status = OrchestrationStatus.failed
            session.error = str(exc)
            yield {"type": "token", "content": f"Multi-agent orchestration failed: {exc}"}

        yield meta_event(session)
        yield done_event(session, run_factory=_session_to_run)

    async def stream_chat_turn(
        self,
        *,
        user_message: str,
        prior_history: list[tuple[str, str]],
        team_task: str,
        resume_session_id: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Chat-aware stream: prior DB turns + current message; team path uses ``team_task``."""
        if resume_session_id:
            async for event in self.stream_resume(resume_session_id, user_message):
                yield event
            return

        session = self._store.create(user_message)
        session.status = OrchestrationStatus.running
        session.routing = await analyze_task_intent(user_message, self._settings)

        yield start_event(session)
        yield meta_event(session)

        try:
            if is_general_chat(session.routing):
                async for event in self._stream_direct_assistant(
                    session,
                    user_message,
                    prior_history,
                ):
                    yield event
            else:
                await self._execute_team(
                    session,
                    team_task,
                    prior_history=prior_history,
                )
                async for event in self._emit_team_stream(session):
                    yield event
        except Exception as exc:
            session.status = OrchestrationStatus.failed
            session.error = str(exc)
            yield {"type": "token", "content": f"Multi-agent orchestration failed: {exc}"}

        yield meta_event(session)
        yield done_event(session, run_factory=_session_to_run)

    async def stream_resume(
        self,
        session_id: str,
        human_input: str,
    ) -> AsyncIterator[dict[str, Any]]:
        session = self._store.get(session_id)
        if not session:
            raise LookupError(f"Session not found: {session_id}")
        if session.status != OrchestrationStatus.awaiting_human:
            raise ValueError("Session is not waiting for human input.")

        session.pending_human_input = human_input.strip()
        session.human_prompt = None
        session.status = OrchestrationStatus.running

        yield start_event(session)
        yield meta_event(session)

        continuation = (
            f"Human response: {human_input.strip()}\n"
            "Continue the workflow. If image work is done, reply TERMINATE."
        )

        prior_messages = len(session.messages)

        try:
            await self._execute_team(session, continuation, prior_history=[])
            async for event in self._emit_team_stream(session, since=prior_messages):
                yield event
        except Exception as exc:
            session.status = OrchestrationStatus.failed
            session.error = str(exc)
            yield {"type": "token", "content": f"Multi-agent resume failed: {exc}"}

        yield meta_event(session)
        yield done_event(session, run_factory=_session_to_run)
