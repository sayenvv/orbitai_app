from __future__ import annotations

import json
import re

from langchain_core.messages import HumanMessage, SystemMessage

from app.services.code_workspace.clovops.context_builder import format_context_for_llm
from orbit_orchestration.config import get_orchestration_settings
from orbit_orchestration.langchain.llm_factory import create_chat_model

_PLANNER_PROMPT = (
    "You are the Planner Agent for Clovops IDE.\n"
    "Return JSON only with this shape:\n"
    "{\n"
    '  "summary": "short plan",\n'
    '  "updates": [{"file_id": "...", "goal": "what to change"}],\n'
    '  "creates": [{"name": "file.ts", "parent_path": "src", "language": "typescript", "goal": "purpose"}]\n'
    "}\n"
    "For code_edit and bug_fix you MUST include at least one update or create.\n"
    "Never return READ_ONLY for edit/fix requests."
)

_JSON_FENCE = re.compile(r"```(?:json)?\s*\n([\s\S]*?)\n```", re.IGNORECASE)


def _parse_plan_json(raw: str) -> dict:
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
    return {"summary": raw.strip(), "updates": [], "creates": []}


async def create_implementation_plan(
    *,
    user_request: str,
    request_type: str,
    search_results: list[dict],
    context_files: list[dict],
    session_context: str = "",
) -> tuple[str, list[str], list[dict], list[dict]]:
    settings = get_orchestration_settings()
    llm = create_chat_model(settings)

    search_summary = "\n".join(
        f"- {item.get('filePath', item.get('fileId'))} (id: {item.get('fileId')})"
        for item in search_results[:10]
    ) or "No search hits."

    prompt = (
        f"{session_context}\n\n"
        f"Request type: {request_type}\n"
        f"User request:\n{user_request}\n\n"
        f"Relevant files:\n{search_summary}\n\n"
        f"File context:\n{format_context_for_llm(context_files)}"
    )

    response = await llm.ainvoke(
        [SystemMessage(content=_PLANNER_PROMPT), HumanMessage(content=prompt)]
    )
    raw = response.content
    plan_text = raw if isinstance(raw, str) else str(raw or "")
    parsed = _parse_plan_json(plan_text)

    updates = [item for item in parsed.get("updates") or [] if isinstance(item, dict)]
    creates = [item for item in parsed.get("creates") or [] if isinstance(item, dict)]
    summary = str(parsed.get("summary") or plan_text).strip()

    planned_files = [
        str(item.get("file_id") or item.get("fileId") or "")
        for item in updates
        if item.get("file_id") or item.get("fileId")
    ]

    if request_type in {"code_edit", "bug_fix"} and not planned_files and not creates:
        for item in context_files[:2]:
            file_id = str(item.get("fileId") or "")
            if file_id:
                planned_files.append(file_id)
                updates.append(
                    {
                        "file_id": file_id,
                        "goal": f"Apply the requested change in {item.get('filePath', file_id)}",
                    }
                )

    plan_display = summary
    if updates or creates:
        lines = [summary, "", "Steps:"]
        for index, item in enumerate(updates, start=1):
            lines.append(f"{index}. Update {item.get('file_id')}: {item.get('goal', 'edit')}")
        for index, item in enumerate(creates, start=1):
            lines.append(
                f"{index}. Create {item.get('parent_path', '')}/{item.get('name')}: {item.get('goal', 'new file')}"
            )
        plan_display = "\n".join(lines)

    return plan_display, planned_files, updates, creates
