from __future__ import annotations

import json
import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

from app.services.code_workspace.clovops.types import ClovopsPipelineStep, ClovopsRequestType
from orbit_orchestration.config import get_orchestration_settings
from orbit_orchestration.langchain.llm_factory import create_chat_model

_JSON_FENCE = re.compile(r"```(?:json)?\s*\n([\s\S]*?)\n```", re.IGNORECASE)

_VALID_INTENTS: frozenset[str] = frozenset({
    "chat",
    "code_question",
    "code_edit",
    "bug_fix",
    "explain",
    "summarize",
    "terminal",
})

_VALID_STEPS: frozenset[str] = frozenset({
    "index_project",
    "search_files",
    "build_context",
    "plan_changes",
    "write_code",
    "review_code",
    "validate_code",
    "chat_response",
    "explain_response",
    "terminal",
})

_RESPONSE_MODES: frozenset[str] = frozenset({"chat", "explain", "summarize"})

_GATEWAY_PROMPT = """You are the Clovops Gateway for an IDE code workspace assistant.

Analyze the user message, conversation history, and workspace context. Decide the user's intent and which agents must run, in order.

Available agents (use these exact ids in `pipeline`):
- index_project — build a map of all project files
- search_files — find files relevant to the request
- build_context — read contents of relevant files
- plan_changes — plan file updates/creates (required before write_code for edits)
- write_code — apply file edits
- review_code — review written changes
- validate_code — syntax-check edited files
- explain_response — answer questions, explain code, or summarize the project using context
- chat_response — casual conversation that does not need project indexing
- terminal — run a safe terminal command in the project directory

Return JSON only:
{
  "intent": "chat|code_question|code_edit|bug_fix|explain|summarize|terminal",
  "reason": "one sentence why",
  "pipeline": ["agent_id", ...],
  "response_mode": "chat|explain|summarize",
  "terminal_command": "shell command string or null",
  "search_query": "focused search query or null"
}

Guidelines:
- Greetings, thanks, small talk → intent chat, pipeline ["chat_response"], response_mode chat
- Summarize / overview / what does this project do → intent summarize, pipeline with index_project, search_files, build_context, explain_response, response_mode summarize
- Explain / how does X work / what does this file do → intent explain, same context pipeline, response_mode explain
- Find / locate / search files → intent code_question, context pipeline ending in explain_response
- Edit / create / fix / implement / refactor code → intent code_edit or bug_fix, full edit pipeline ending with validate_code
- Run / execute / run the project / start server / install deps → intent terminal, pipeline ["index_project", "search_files", "build_context", "terminal"]
- For run-the-project requests, do NOT guess a single run command — leave terminal_command null so the run planner can install dependencies first
- Explicit one-off commands (e.g. "run python3 script.py") may set terminal_command directly
- terminal_command must be a single safe command (no shell chaining with ; | &) or null
- Allowed install/run commands include pip3 install, npm install, pnpm install, python3, uvicorn
- Do not include agents that are unnecessary for the request
- pipeline must contain only agent ids from the list above
"""


def _parse_gateway_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    match = _JSON_FENCE.search(text)
    if match:
        text = match.group(1).strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    return {}


def _sanitize_pipeline(steps: list[Any]) -> list[ClovopsPipelineStep]:
    pipeline: list[ClovopsPipelineStep] = []
    for step in steps:
        name = str(step or "").strip()
        if name in _VALID_STEPS and name not in pipeline:
            pipeline.append(name)  # type: ignore[arg-type]
    return pipeline


def _default_pipeline(intent: str) -> list[ClovopsPipelineStep]:
    if intent == "chat":
        return ["chat_response"]
    if intent == "terminal":
        return ["index_project", "search_files", "build_context", "terminal"]
    if intent in {"code_edit", "bug_fix"}:
        return [
            "index_project",
            "search_files",
            "build_context",
            "plan_changes",
            "write_code",
            "review_code",
            "validate_code",
        ]
    return ["index_project", "search_files", "build_context", "explain_response"]


def _sanitize_intent(raw: str) -> ClovopsRequestType:
    intent = str(raw or "").strip().lower()
    if intent == "summarize":
        return "summarize"
    if intent in _VALID_INTENTS:
        return intent  # type: ignore[return-value]
    return "code_question"


async def plan_clovops_flow(
    *,
    user_request: str,
    session_context: str = "",
    active_file_path: str | None = None,
    project_title: str = "Project",
) -> dict[str, Any]:
    """LLM gateway — classify intent and choose a dynamic agent pipeline."""
    settings = get_orchestration_settings()
    llm = create_chat_model(settings)

    context_lines = [f"Project: {project_title}"]
    if active_file_path:
        context_lines.append(f"Active file: {active_file_path}")
    if session_context.strip():
        context_lines.append(session_context.strip())

    prompt = "\n\n".join(context_lines + [f"User message:\n{user_request.strip()}"])

    response = await llm.ainvoke(
        [SystemMessage(content=_GATEWAY_PROMPT), HumanMessage(content=prompt)]
    )
    raw = response.content
    plan_text = raw if isinstance(raw, str) else str(raw or "")
    parsed = _parse_gateway_json(plan_text)

    intent = _sanitize_intent(str(parsed.get("intent") or ""))
    reason = str(parsed.get("reason") or "Classified by gateway.").strip()

    pipeline = _sanitize_pipeline(parsed.get("pipeline") or [])
    if not pipeline:
        pipeline = _default_pipeline(intent)

    response_mode = str(parsed.get("response_mode") or "").strip().lower()
    if response_mode not in _RESPONSE_MODES:
        if intent == "chat":
            response_mode = "chat"
        elif intent == "summarize":
            response_mode = "summarize"
        else:
            response_mode = "explain"

    terminal_command = parsed.get("terminal_command")
    if terminal_command is not None:
        terminal_command = str(terminal_command).strip() or None

    search_query = parsed.get("search_query")
    if search_query is not None:
        search_query = str(search_query).strip() or None

    return {
        "request_type": intent,
        "routing_reason": reason,
        "pipeline": pipeline,
        "response_mode": response_mode,
        "terminal_command": terminal_command,
        "search_query": search_query,
    }
