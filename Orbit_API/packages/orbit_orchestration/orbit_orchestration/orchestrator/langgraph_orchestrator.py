from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage

from orbit_orchestration.config import OrchestrationSettings, get_orchestration_settings
from orbit_orchestration.domain.message_text import sanitize_for_chat_ui
from orbit_orchestration.domain.routing import TaskRouting, is_general_chat
from orbit_orchestration.domain.session import OrchestrationSession, SessionStore
from orbit_orchestration.domain.types import AgentName, OrchestrationMessage, OrchestrationRun, OrchestrationStatus
from orbit_orchestration.langchain.direct_chat import direct_chat_stream
from orbit_orchestration.langchain.intent_router import analyze_task_intent
from orbit_orchestration.agents.registry import get_specialist_graph
from orbit_orchestration.tools.card_builder import (
    _detect_place_category,
    brief_listing_reply,
    extract_job_search_params,
    extract_place_search_params,
    is_listing_card_set,
    merge_cards,
    parse_tool_cards,
    parse_tool_cards_auto,
    resolve_tool_name_from_event,
)
from orbit_orchestration.tools.job_tools import search_job_listings
from orbit_orchestration.tools.places import search_places
from orbit_orchestration.tools.web_tools import web_search
from orbit_orchestration.orchestrator.streaming import (
    done_event,
    meta_event,
    start_event,
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
        images=list(session.images),
        cards=list(session.cards),
    )


def _history_to_messages(history: list[tuple[str, str]]) -> list:
    messages: list = []
    for role, content in history[-12:]:
        if role == "user":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))
    return messages


def _chunk_text(chunk: AIMessageChunk | AIMessage) -> str:
    content = chunk.content
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
            elif hasattr(block, "text"):
                parts.append(str(block.text))
        return "".join(parts)
    return str(content)


class LangGraphOrchestrator:
    """LangGraph + LangChain multi-agent orchestration with a single streaming path."""

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

    async def _stream_direct(
        self,
        session: OrchestrationSession,
        user_message: str,
        prior_history: list[tuple[str, str]],
    ) -> AsyncIterator[dict[str, Any]]:
        full = ""
        async for token in direct_chat_stream(user_message, prior_history, self._settings):
            full += token
            yield {"type": "token", "content": token}

        text = sanitize_for_chat_ui(full) or "Sorry, I could not generate a response. Please try again."
        session.messages.append(OrchestrationMessage(source="assistant", content=text))
        session.status = OrchestrationStatus.completed
        session.result = text

    async def _stream_specialist(
        self,
        session: OrchestrationSession,
        agent: AgentName,
        user_message: str,
        prior_history: list[tuple[str, str]],
    ) -> AsyncIterator[dict[str, Any]]:
        graph = get_specialist_graph(agent, self._settings)
        messages = _history_to_messages(prior_history)
        messages.append(HumanMessage(content=user_message))

        full = ""
        listing_mode = False

        if agent == "job_search_agent":
            query, location = extract_job_search_params(user_message)
            try:
                prefetch_output = await asyncio.to_thread(
                    search_job_listings.invoke,
                    {"query": query, "location": location, "max_results": 6},
                )
                prefetch_cards = parse_tool_cards("search_job_listings", prefetch_output)
                if prefetch_cards:
                    session.cards = merge_cards(session.cards, prefetch_cards)
                    yield {"type": "cards", "cards": prefetch_cards}
                    text = brief_listing_reply(session.cards, task=user_message)
                    yield {"type": "token", "content": text}
                    session.messages.append(OrchestrationMessage(source=agent, content=text))
                    session.status = OrchestrationStatus.completed
                    session.result = text
                    return
            except Exception:
                pass

        if agent == "web_search_agent":
            try:
                category = _detect_place_category(user_message)
                if category:
                    query, location, place_category = extract_place_search_params(user_message)
                    prefetch_output = await asyncio.to_thread(
                        search_places.invoke,
                        {
                            "query": query,
                            "location": location,
                            "category": place_category,
                            "max_results": 6,
                        },
                    )
                    tool_name = "search_places"
                else:
                    prefetch_output = await asyncio.to_thread(
                        web_search.invoke,
                        {
                            "query": user_message,
                            "max_results": 5,
                            "include_images": True,
                            "max_images": 6,
                        },
                    )
                    tool_name = "web_search"
                prefetch_cards = parse_tool_cards(tool_name, prefetch_output)
                if prefetch_cards:
                    session.cards = merge_cards(session.cards, prefetch_cards)
                    yield {"type": "cards", "cards": prefetch_cards}
                    text = brief_listing_reply(session.cards, task=user_message)
                    yield {"type": "token", "content": text}
                    session.messages.append(OrchestrationMessage(source=agent, content=text))
                    session.status = OrchestrationStatus.completed
                    session.result = text
                    return
            except Exception:
                pass

        async for event in graph.astream_events(
            {"messages": messages},
            version="v2",
            config={"recursion_limit": 12},
        ):
            event_type = event.get("event")
            if event_type == "on_tool_end":
                output = event.get("data", {}).get("output")
                tool_name = resolve_tool_name_from_event(event)
                found_cards = parse_tool_cards(tool_name, output) if tool_name else []
                if not found_cards:
                    found_cards = parse_tool_cards_auto(output)
                if found_cards:
                    session.cards = merge_cards(session.cards, found_cards)
                    if is_listing_card_set(found_cards):
                        listing_mode = True
                    yield {"type": "cards", "cards": found_cards}
                continue

            if event_type != "on_chat_model_stream":
                continue
            chunk = event.get("data", {}).get("chunk")
            if not chunk:
                continue
            token = _chunk_text(chunk)
            if not token:
                continue
            full += token
            if not listing_mode:
                yield {"type": "token", "content": token}

        if listing_mode and session.cards:
            text = brief_listing_reply(session.cards, task=user_message) or sanitize_for_chat_ui(full)
            yield {"type": "token", "content": text}
        else:
            text = sanitize_for_chat_ui(full) or "Sorry, I could not generate a response. Please try again."
        session.messages.append(OrchestrationMessage(source=agent, content=text))
        session.status = OrchestrationStatus.completed
        session.result = text

    async def _run_turn(
        self,
        session: OrchestrationSession,
        *,
        user_message: str,
        prior_history: list[tuple[str, str]],
    ) -> AsyncIterator[dict[str, Any]]:
        session.status = OrchestrationStatus.running
        routing = await self._ensure_routing(session)

        if is_general_chat(routing):
            async for event in self._stream_direct(session, user_message, prior_history):
                yield event
            return

        agent = routing.primary_agent
        if agent == "assistant":
            agent = routing.selected_agents[0] if routing.selected_agents else "research_agent"

        try:
            async for event in self._stream_specialist(session, agent, user_message, prior_history):
                yield event
        except Exception as exc:
            session.status = OrchestrationStatus.failed
            session.error = str(exc)
            yield {"type": "token", "content": f"Orchestration failed: {exc}"}

    async def start(self, task: str) -> OrchestrationRun:
        session = self._store.create(task)
        async for _ in self._run_turn(session, user_message=task, prior_history=[]):
            pass
        return _session_to_run(session)

    async def resume(self, session_id: str, human_input: str) -> OrchestrationRun:
        session = self._store.get(session_id)
        if not session:
            raise LookupError(f"Session not found: {session_id}")
        async for _ in self._run_turn(session, user_message=human_input, prior_history=[]):
            pass
        return _session_to_run(session)

    def get_session(self, session_id: str) -> OrchestrationRun | None:
        session = self._store.get(session_id)
        return _session_to_run(session) if session else None

    async def stream_start(self, task: str) -> AsyncIterator[dict[str, Any]]:
        session = self._store.create(task)
        session.status = OrchestrationStatus.running
        session.routing = await analyze_task_intent(task, self._settings)

        yield start_event(session)
        yield meta_event(session)

        try:
            async for event in self._run_turn(session, user_message=task, prior_history=[]):
                yield event
        except Exception as exc:
            session.status = OrchestrationStatus.failed
            session.error = str(exc)
            yield {"type": "token", "content": f"Orchestration failed: {exc}"}

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
            async for event in self._run_turn(
                session,
                user_message=team_task,
                prior_history=prior_history,
            ):
                yield event
        except Exception as exc:
            session.status = OrchestrationStatus.failed
            session.error = str(exc)
            yield {"type": "token", "content": f"Orchestration failed: {exc}"}

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

        session.status = OrchestrationStatus.running
        yield start_event(session)
        yield meta_event(session)

        try:
            async for event in self._run_turn(session, user_message=human_input, prior_history=[]):
                yield event
        except Exception as exc:
            session.status = OrchestrationStatus.failed
            session.error = str(exc)
            yield {"type": "token", "content": f"Orchestration resume failed: {exc}"}

        yield meta_event(session)
        yield done_event(session, run_factory=_session_to_run)


# Backward-compatible alias for app imports
GroupChatOrchestrator = LangGraphOrchestrator
