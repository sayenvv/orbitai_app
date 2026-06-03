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
            "You route user requests to specialist agents in a multi-agent system.\n"
            "Agents:\n"
            "- assistant: general chat, greetings, Q&A, explanations (default for short messages)\n"
            "- summarizer: ONLY when the user provides long pasted text to summarize or explicitly asks for a summary — "
            "never for code, math, or how-to programming questions\n"
            "- image_generator: create, draw, illustrate, or design images\n"
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


def _wants_code_or_explain(task: str) -> bool:
    text = task.lower()
    return bool(
        re.search(
            r"\b(python|javascript|typescript|java|golang|rust|code|function|class|script|"
            r"fibonacci|algorithm|implement|write a|how to|example|snippet|program)\b",
            text,
        )
    )


def _wants_image(task: str) -> bool:
    text = task.lower()
    return bool(
        re.search(
            r"\b(image|picture|photo|illustration|artwork|draw|sketch|render|logo|icon|poster|cover)\b",
            text,
        )
        or re.search(r"\b(generate|create|make|design)\s+(an?\s+)?(image|picture|photo|illustration)\b", text)
        or re.search(r"\b(generate|create|make|design)\s+.*\s+(image|picture|photo)\b", text)
    )


def _keyword_routing(task: str) -> TaskRouting:
    text = task.lower()
    if _wants_code_or_explain(task) and not re.search(
        r"\b(summar(y|ize|ise)|tldr|condense)\b", text
    ):
        return TaskRouting(
            primary_agent="assistant",
            selected_agents=[],
            intent="code_generation",
            topics=_extract_topics_heuristic(task),
            reasoning="Programming or explanation request; assistant only.",
        )
    wants_summary = bool(
        re.search(
            r"\b(summar(y|ize|ise)|tldr|condense|key points?|brief|overview)\b",
            text,
        )
    )
    wants_image = _wants_image(task)

    selected: list[AgentName] = []
    if wants_summary:
        selected.append("summarizer")
    if wants_image:
        selected.append("image_generator")
    is_greeting = bool(re.match(r"^(hi|hello|hey|yo|hiya)\b", text))
    is_question = bool(
        re.search(
            r"\b(what is|what are|how does|how do|why is|tell me about|who is|explain)\b",
            text,
        )
        or re.search(r"\bwhat is\s+\w+", text)
    )
    is_short = len(task.split()) <= 12 and not wants_summary and not wants_image

    if not selected:
        if wants_summary or len(task.split()) > 80:
            selected = ["summarizer"]
        elif wants_image:
            selected = ["image_generator"]
        else:
            intent = "general_chat"
            if is_greeting:
                intent = "greet_user"
            elif is_question:
                intent = "question_answer"
            return TaskRouting(
                primary_agent="assistant",
                selected_agents=[],
                intent=intent,
                topics=_extract_topics_heuristic(task),
                reasoning="General conversation; no specialist agents required.",
            )

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
    elif is_greeting or is_question or is_short:
        intent = "general_chat"
        if is_greeting:
            intent = "greet_user"
        elif is_question:
            intent = "question_answer"
        return TaskRouting(
            primary_agent="assistant",
            selected_agents=[],
            intent=intent,
            topics=_extract_topics_heuristic(task),
            reasoning="Routed from keyword analysis of the user prompt.",
        )

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
        return TaskRouting(
            primary_agent="assistant",
            selected_agents=[],
            intent=schema.intent.strip() or "general_chat",
            topics=[t.strip() for t in schema.topics if t.strip()][:8],
            reasoning=schema.reasoning.strip(),
        )

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


def normalize_task_routing(routing: TaskRouting, task: str) -> TaskRouting:
    """Correct LLM misroutes (e.g. summarizer for Python/code questions)."""
    if _wants_image(task) and not re.search(r"\b(summar(y|ize|ise)|tldr|condense)\b", task.lower()):
        return TaskRouting(
            primary_agent="image_generator",
            selected_agents=["image_generator"],
            intent="image_generation",
            topics=routing.topics or _extract_topics_heuristic(task),
            reasoning="Image creation request; human approval required before generation.",
        )
    if _wants_code_or_explain(task) and not re.search(
        r"\b(summar(y|ize|ise)|tldr|condense)\b",
        task.lower(),
    ):
        return TaskRouting(
            primary_agent="assistant",
            selected_agents=[],
            intent="code_generation",
            topics=routing.topics,
            reasoning="Programming or explanation request; assistant only.",
        )
    if is_general_chat(routing):
        return TaskRouting(
            primary_agent="assistant",
            selected_agents=[],
            intent=routing.intent
            if routing.intent not in ("content_summarization", "summarize_then_image")
            else "general_chat",
            topics=routing.topics,
            reasoning=routing.reasoning,
        )
    return routing


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
            routing = normalize_task_routing(_schema_to_routing(schema), trimmed)
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
            return normalize_task_routing(parsed, trimmed)
    except Exception:
        pass

    return normalize_task_routing(_keyword_routing(trimmed), trimmed)
