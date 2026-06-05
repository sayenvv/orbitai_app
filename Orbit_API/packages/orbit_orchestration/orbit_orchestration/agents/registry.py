from __future__ import annotations

from functools import lru_cache

from langchain_core.messages import SystemMessage
from langgraph.prebuilt import create_react_agent

from orbit_orchestration.config import OrchestrationSettings, get_orchestration_settings
from orbit_orchestration.domain.types import AgentName, SPECIALIST_AGENTS
from orbit_orchestration.langchain.llm_factory import create_chat_model
from orbit_orchestration.tools import (
    calculator,
    convert_units,
    fetch_webpage,
    search_indeed_jobs,
    search_job_listings,
    search_knowledge_base,
    search_linkedin_jobs,
    search_places,
    summarize_text,
    web_search,
)

_AGENT_TOOLS: dict[AgentName, list] = {
    "web_search_agent": [web_search, search_places, fetch_webpage],
    "research_agent": [search_knowledge_base, summarize_text],
    "job_search_agent": [search_job_listings, search_indeed_jobs, search_linkedin_jobs],
    "math_agent": [calculator, convert_units],
}

_AGENT_PROMPTS: dict[AgentName, str] = {
    "web_search_agent": (
        "You are a web search specialist. Call exactly one search tool, then stop. "
        "Use search_places for hotels/restaurants, web_search for general queries. "
        "The UI renders adaptive cards from tool JSON—never list results in prose. "
        "After the tool returns, reply in one short sentence only."
    ),
    "research_agent": (
        "You are a research specialist. Use search_knowledge_base for FastAPI, LangGraph, "
        "and LangChain topics. Use summarize_text to condense long passages."
    ),
    "job_search_agent": (
        "You are a job search specialist. Call exactly one job search tool, then stop. "
        "The UI renders job adaptive cards from tool JSON—never list jobs in prose. "
        "After the tool returns, reply in one short sentence only."
    ),
    "math_agent": (
        "You are a math specialist. Use calculator for expressions and convert_units for "
        "unit conversions. Show the result clearly."
    ),
}


def get_specialist_graph(
    agent: AgentName,
    settings: OrchestrationSettings | None = None,
):
    cfg = settings or get_orchestration_settings()
    if agent not in SPECIALIST_AGENTS:
        raise ValueError(f"Not a specialist agent: {agent}")
    return _get_specialist_graph_cached(
        agent,
        cfg.llm_provider.strip().lower(),
        cfg.resolved_model(),
        "cards-v4",
    )


@lru_cache(maxsize=8)
def _get_specialist_graph_cached(agent: str, provider: str, model: str, _graph_rev: str):
    cfg = get_orchestration_settings().model_copy(
        update={"llm_provider": provider, "orchestration_model": model},
    )
    llm = create_chat_model(cfg)
    tools = _AGENT_TOOLS[agent]  # type: ignore[index]
    prompt = _AGENT_PROMPTS[agent]  # type: ignore[index]
    llm = llm.bind_tools(tools)
    return create_react_agent(
        llm,
        tools,
        prompt=SystemMessage(content=prompt),
    )
