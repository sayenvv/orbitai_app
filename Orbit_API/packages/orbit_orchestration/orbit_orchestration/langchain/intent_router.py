from __future__ import annotations

import json
import re

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from orbit_orchestration.config import OrchestrationSettings
from orbit_orchestration.domain.routing import VALID_AGENTS, TaskRouting, is_general_chat
from orbit_orchestration.domain.types import AgentName
from orbit_orchestration.langchain.llm_factory import create_chat_model

_ROUTING_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You route user requests to specialist agents.\n"
            "Agents:\n"
            "- assistant: greetings, general Q&A, explanations, coding help (default)\n"
            "- web_search_agent: live web search, current events, news, looking up URLs/pages\n"
            "- research_agent: internal KB about FastAPI, LangGraph, LangChain; summarizing long text\n"
            "- job_search_agent: job listings, careers, hiring, Indeed/LinkedIn/Glassdoor\n"
            "- math_agent: calculations, unit conversions, numeric problems\n\n"
            "Return JSON only with keys: primary_agent, selected_agents (array), intent (snake_case), "
            "topics (array), reasoning (one sentence).",
        ),
        ("human", "User request:\n{task}"),
    ]
)


class _RoutingSchema(BaseModel):
    primary_agent: str = Field(description="assistant | web_search_agent | research_agent | job_search_agent | math_agent")
    selected_agents: list[str] = Field(default_factory=list)
    intent: str = ""
    topics: list[str] = Field(default_factory=list)
    reasoning: str = ""


def _normalize_agents(raw: list[str]) -> list[AgentName]:
    picked: list[AgentName] = []
    for name in raw:
        key = name.strip().lower().replace(" ", "_").replace("-", "_")
        if key in VALID_AGENTS and key not in picked and key != "assistant":
            picked.append(key)  # type: ignore[arg-type]
    return picked


def _extract_topics_heuristic(task: str) -> list[str]:
    topics: list[str] = []
    quoted = re.findall(r'"([^"]{2,80})"|\'([^\']{2,80})\'', task)
    for pair in quoted[:3]:
        fragment = pair[0] or pair[1]
        if fragment.strip():
            topics.append(fragment.strip())
    if not topics and len(task) > 20:
        topics.append(task.strip()[:80])
    return topics[:5]


def _keyword_routing(task: str) -> TaskRouting:
    text = task.lower()

    if re.search(r"\b(job|jobs|hiring|career|vacancy|opening|indeed|linkedin|glassdoor|salary)\b", text):
        return TaskRouting(
            primary_agent="job_search_agent",
            selected_agents=["job_search_agent"],
            intent="job_search",
            topics=_extract_topics_heuristic(task),
            reasoning="Job-related keywords detected.",
        )

    if re.search(r"\b(hotel|hotels|restaurant|restaurants|stay|accommodation|book a room|airbnb)\b", text):
        return TaskRouting(
            primary_agent="web_search_agent",
            selected_agents=["web_search_agent"],
            intent="hotel_search",
            topics=_extract_topics_heuristic(task),
            reasoning="Hotel or accommodation search detected.",
        )

    if re.search(
        r"\b(search the web|web search|google|look up online|latest news|current events|"
        r"breaking news|headlines?|fetch (this )?url|https?://)\b",
        text,
    ) or re.search(r"\bnews\b", text):
        return TaskRouting(
            primary_agent="web_search_agent",
            selected_agents=["web_search_agent"],
            intent="web_search",
            topics=_extract_topics_heuristic(task),
            reasoning="Live web lookup requested.",
        )

    if re.search(r"\b(fastapi|langgraph|langchain)\b", text) or re.search(
        r"\b(summar(y|ize|ise)|tldr|condense|key points?)\b",
        text,
    ):
        agent: AgentName = "research_agent"
        return TaskRouting(
            primary_agent=agent,
            selected_agents=[agent],
            intent="knowledge_research",
            topics=_extract_topics_heuristic(task),
            reasoning="Knowledge-base or summarization request.",
        )

    if re.search(
        r"\b(calculate|calculator|convert|km|miles|kg|lbs|celsius|fahrenheit|\+|\*|\*\*|math)\b",
        text,
    ):
        return TaskRouting(
            primary_agent="math_agent",
            selected_agents=["math_agent"],
            intent="math_calculation",
            topics=_extract_topics_heuristic(task),
            reasoning="Math or unit conversion request.",
        )

    is_greeting = bool(re.match(r"^(hi|hello|hey|yo|hiya)\b", text))
    return TaskRouting(
        primary_agent="assistant",
        selected_agents=[],
        intent="greet_user" if is_greeting else "general_chat",
        topics=_extract_topics_heuristic(task),
        reasoning="General conversation; no specialist required.",
    )


def _schema_to_routing(schema: _RoutingSchema) -> TaskRouting:
    selected = _normalize_agents(schema.selected_agents)
    primary_raw = schema.primary_agent.strip().lower().replace(" ", "_").replace("-", "_")
    primary: AgentName = (
        primary_raw if primary_raw in VALID_AGENTS else (selected[0] if selected else "assistant")  # type: ignore[assignment]
    )

    if primary == "assistant" and not selected:
        return TaskRouting(
            primary_agent="assistant",
            selected_agents=[],
            intent=schema.intent.strip() or "general_chat",
            topics=[t.strip() for t in schema.topics if t.strip()][:8],
            reasoning=schema.reasoning.strip(),
        )

    if primary == "assistant" and selected:
        primary = selected[0]

    if primary not in selected:
        selected.insert(0, primary)

    return TaskRouting(
        primary_agent=primary,
        selected_agents=selected,
        intent=schema.intent.strip() or "specialist_request",
        topics=[t.strip() for t in schema.topics if t.strip()][:8],
        reasoning=schema.reasoning.strip(),
    )


def _parse_json_routing(text: str) -> TaskRouting | None:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        data = json.loads(cleaned)
        return _schema_to_routing(_RoutingSchema.model_validate(data))
    except (json.JSONDecodeError, ValueError):
        return None


def normalize_task_routing(routing: TaskRouting, task: str) -> TaskRouting:
    keyword = _keyword_routing(task)
    if keyword.primary_agent != "assistant" and is_general_chat(routing):
        return keyword
    return routing


async def analyze_task_intent(
    task: str,
    settings: OrchestrationSettings | None = None,
) -> TaskRouting:
    trimmed = task.strip()
    if not trimmed:
        return TaskRouting(
            primary_agent="assistant",
            selected_agents=[],
            intent="empty_request",
            topics=[],
            reasoning="No task text provided.",
        )

    keyword = _keyword_routing(trimmed)
    if keyword.primary_agent != "assistant":
        return keyword

    cfg = settings
    llm = create_chat_model(cfg)
    try:
        structured = llm.with_structured_output(_RoutingSchema)
        chain = _ROUTING_PROMPT | structured
        schema = await chain.ainvoke({"task": trimmed[:8_000]})
        if isinstance(schema, _RoutingSchema):
            return normalize_task_routing(_schema_to_routing(schema), trimmed)
    except Exception:
        pass

    try:
        chain = _ROUTING_PROMPT | llm
        response = await chain.ainvoke({"task": trimmed[:8_000]})
        content = response.content
        text = content if isinstance(content, str) else str(content)
        parsed = _parse_json_routing(text)
        if parsed:
            return normalize_task_routing(parsed, trimmed)
    except Exception:
        pass

    return _keyword_routing(trimmed)
