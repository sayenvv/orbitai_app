from __future__ import annotations

from autogen_agentchat.messages import HandoffMessage

from orbit_orchestration.autogen.group_chat_team import build_group_chat_team
from orbit_orchestration.autogen.model_client import create_model_client
from orbit_orchestration.config import OrchestrationSettings, get_orchestration_settings
from orbit_orchestration.domain.constants import HITL_PAUSE_SENTINEL
from orbit_orchestration.domain.routing import TaskRouting
from orbit_orchestration.domain.session import OrchestrationSession, SessionStore
from orbit_orchestration.domain.types import OrchestrationMessage, OrchestrationRun, OrchestrationStatus
from orbit_orchestration.langchain.intent_router import analyze_task_intent


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
        if content.strip() and content.strip() != HITL_PAUSE_SENTINEL:
            agent_name = (
                source if source in ("human", "summarizer", "image_generator") else "summarizer"
            )
            extracted.append(OrchestrationMessage(source=agent_name, content=content.strip()))
    return extracted


def _final_text(messages: list[OrchestrationMessage]) -> str:
    if not messages:
        return ""
    tail = messages[-3:]
    return "\n\n".join(f"[{m.source}] {m.content}" for m in tail)


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

    async def _execute_team(self, session: OrchestrationSession, task: str) -> None:
        session.status = OrchestrationStatus.running
        try:
            routing = await self._ensure_routing(session)
            model_client = create_model_client(self._settings)
            team = build_group_chat_team(
                session,
                model_client,
                self._settings,
                routing=routing,
            )
            result = await team.run(task=_task_with_routing(task, routing))
            session.messages.extend(_extract_messages_from_team_result(session, result))
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
