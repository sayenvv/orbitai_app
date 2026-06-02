from __future__ import annotations

import json
import re

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from orbit_orchestration.config import OrchestrationSettings
from orbit_orchestration.domain.routing import VALID_AGENTS, TaskRouting
from orbit_orchestration.domain.types import AgentName
from orbit_orchestration.langchain.llm_factory import create_chat_model

_ROUTING_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You route user requests to specialist agents in a multi-agent system.\n"
            "Agents:\n"
            "- summarizer: summarize, condense, explain, or extract key points from text\n"
            "- image_generator: create, draw, illustrate, or design images from descriptions\n"
            "- human: only when the user must approve something before work proceeds (rare at routing)\n\n"
            "Return JSON only with keys: primary_agent, selected_agents (array), intent (snake_case label), "
            "topics (array of short strings), reasoning (one sentence).",
        ),
        ("human", "User request:\n{task}"),
    ]
)


class _RoutingSchema(BaseModel):
    primary_agent: str = Field(description="summarizer | image_generator | human")
    selected_agents: list[str] = Field(description="Agents to involve")
    intent: str = Field(description="Short intent label")
    topics: list[str] = Field(default_factory=list)
    reasoning: str = ""


def _normalize_agents(raw: list[str]) -> list[AgentName]:
    picked: list[AgentName] = []
    for name in raw:
        key = name.strip().lower().replace(" ", "_")
        if key in VALID_AGENTS and key not in picked:
            picked.append(key)  # type: ignore[arg-type]
    return picked


def _keyword_routing(task: str) -> TaskRouting:
    text = task.lower()
    wants_summary = bool(
        re.search(
            r"\b(summar(y|ize|ise)|tldr|condense|key points?|brief|overview|explain)\b",
            text,
        )
    )
    wants_image = bool(
        re.search(
            r"\b(image|picture|photo|illustration|cover|artwork|draw|generate.*visual|logo|icon)\b",
            text,
        )
    )

    selected: list[AgentName] = []
    if wants_summary:
        selected.append("summarizer")
    if wants_image:
        selected.append("image_generator")
    if not selected:
        if len(task.split()) > 80:
            selected = ["summarizer"]
        else:
            selected = ["summarizer", "image_generator"]

    primary: AgentName = selected[0]
    if wants_image and not wants_summary:
        primary = "image_generator"
    elif wants_summary:
        primary = "summarizer"

    intent = "mixed_workflow"
    if wants_summary and not wants_image:
        intent = "content_summarization"
    elif wants_image and not wants_summary:
        intent = "image_generation"
    elif wants_summary and wants_image:
        intent = "summarize_then_image"

    topics = _extract_topics_heuristic(task)
    return TaskRouting(
        primary_agent=primary,
        selected_agents=selected,
        intent=intent,
        topics=topics,
        reasoning="Routed from keyword analysis of the user prompt.",
    )


def _extract_topics_heuristic(task: str) -> list[str]:
    """Lightweight topic hints without an LLM."""
    topics: list[str] = []
    quoted = re.findall(r'"([^"]{2,80})"|\'([^\']{2,80})\'', task)
    for pair in quoted[:3]:
        fragment = pair[0] or pair[1]
        if fragment.strip():
            topics.append(fragment.strip())
    for match in re.finditer(
        r"\b(?:about|on|for|regarding)\s+([a-z0-9][a-z0-9\s\-]{2,50})",
        task,
        re.I,
    ):
        phrase = match.group(1).strip().rstrip(".")
        if phrase and phrase.lower() not in topics:
            topics.append(phrase[:60])
    if not topics and len(task) > 20:
        topics.append(task.strip()[:80])
    return topics[:5]


def _schema_to_routing(schema: _RoutingSchema) -> TaskRouting:
    selected = _normalize_agents(schema.selected_agents)
    if not selected:
        selected = ["summarizer"]

    primary_raw = schema.primary_agent.strip().lower().replace(" ", "_")
    primary: AgentName = (
        primary_raw if primary_raw in VALID_AGENTS else selected[0]  # type: ignore[assignment]
    )
    if primary not in selected and primary != "human":
        selected.insert(0, primary)

    if "human" in selected and len(selected) > 1:
        selected = [a for a in selected if a != "human"]

    return TaskRouting(
        primary_agent=primary if primary in selected else selected[0],
        selected_agents=selected,
        intent=schema.intent.strip() or "general_request",
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


async def analyze_task_intent(
    task: str,
    settings: OrchestrationSettings | None = None,
) -> TaskRouting:
    """Classify user prompt → agents, intent, and topics."""
    trimmed = task.strip()
    if not trimmed:
        return TaskRouting(
            primary_agent="summarizer",
            selected_agents=["summarizer"],
            intent="empty_request",
            topics=[],
            reasoning="No task text provided; defaulting to summarizer.",
        )

    cfg = settings
    llm = create_chat_model(cfg)
    try:
        structured = llm.with_structured_output(_RoutingSchema)
        chain = _ROUTING_PROMPT | structured
        schema = await chain.ainvoke({"task": trimmed[:8_000]})
        if isinstance(schema, _RoutingSchema):
            routing = _schema_to_routing(schema)
            if "human" not in routing.selected_agents:
                return routing
    except Exception:
        pass

    try:
        chain = _ROUTING_PROMPT | llm
        response = await chain.ainvoke({"task": trimmed[:8_000]})
        content = response.content
        text = content if isinstance(content, str) else str(content)
        parsed = _parse_json_routing(text)
        if parsed and "human" not in parsed.selected_agents:
            return parsed
    except Exception:
        pass

    return _keyword_routing(trimmed)
