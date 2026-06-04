from __future__ import annotations

import json
import re
from typing import Any

from clovai_apps.project_planning.ai_assist_schemas import (
    ProjectPlanningAiAssistRequest,
    ProjectPlanningAiAssistResponse,
)
from clovai_apps.project_planning.schemas import ProjectPlanningWorksheetContent
from orbit_orchestration.config import get_orchestration_settings
from orbit_orchestration.langchain.direct_chat import direct_chat_reply

_WORKSHEET_FENCE = re.compile(
    r"```(?:worksheet|json)?\s*\n([\s\S]*?)\n```",
    re.IGNORECASE,
)


def _system_prompt(req: ProjectPlanningAiAssistRequest) -> str:
    worksheet_json = json.dumps(req.worksheet.model_dump(by_alias=True), indent=2)
    return (
        "You are an expert product and software planning assistant for Clovai Project Studio.\n"
        f"Project: {req.project_name}\n"
        f"Summary: {req.project_summary}\n"
        f"Phase: {req.phase_label}\n"
        f"Deliverable: {req.artifact_label} ({req.artifact_format})\n"
        f"Description: {req.artifact_description}\n\n"
        "The user is editing a deliverable worksheet with blocks: heading, paragraph, caption, "
        "link (label, url), image (url, alt, caption), table (headers + rows), "
        "flowchart (nodes), and matrix (headers + rows). "
        "Paragraphs may include inline links as [label](url) and colors as <c:#hex>text</c>.\n\n"
        "Rules:\n"
        "1. Reply in clear Markdown for the user (explain what you did or answer questions).\n"
        "2. When the user asks you to write, revise, expand, or update the deliverable content, "
        "you MUST include an updated worksheet as a single fenced JSON block at the END of your reply:\n"
        '   ```worksheet\n   {"blocks": [...]}\n   ```\n'
        "3. The worksheet JSON must use camelCase keys matching this shape: "
        '{ "blocks": [ { "id": "...", "type": "heading"|"paragraph"|"caption"|"link"|"image"|"table"|"flowchart"|"matrix", ... } ] }\n'
        "4. Preserve existing block ids when editing; only add new ids for new blocks.\n"
        "5. If the user highlighted text on the canvas, prioritize editing that selection.\n"
        "6. If you are only answering a question without changing the worksheet, omit the worksheet fence.\n\n"
        f"Current worksheet JSON:\n{worksheet_json}"
    )


def _build_user_message(req: ProjectPlanningAiAssistRequest) -> str:
    message = req.message.strip()
    if not req.text_selection or not req.text_selection.selected_text.strip():
        return message
    sel = req.text_selection
    return (
        f"{message}\n\n"
        "[Canvas text selection]\n"
        f"Block id: {sel.block_id}\n"
        f"Selected text: \"{sel.selected_text.strip()}\"\n"
        f"Character range: {sel.start}–{sel.end}"
    )


def _history_pairs(req: ProjectPlanningAiAssistRequest) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for turn in req.history[-8:]:
        pairs.append((turn.role, turn.content))
    return pairs


def _parse_worksheet_payload(raw: str) -> ProjectPlanningWorksheetContent | None:
    text = raw.strip()
    if not text:
        return None
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    if isinstance(data, dict) and "blocks" in data:
        payload: dict[str, Any] = data
    elif isinstance(data, dict) and "worksheet" in data and isinstance(data["worksheet"], dict):
        payload = data["worksheet"]
    else:
        return None
    try:
        return ProjectPlanningWorksheetContent.model_validate(payload)
    except Exception:
        return None


def _extract_worksheet_from_reply(reply: str) -> tuple[str, ProjectPlanningWorksheetContent | None]:
    match = _WORKSHEET_FENCE.search(reply)
    if not match:
        return reply.strip(), None
    worksheet = _parse_worksheet_payload(match.group(1))
    visible = (reply[: match.start()] + reply[match.end() :]).strip()
    return visible or "I've updated the deliverable worksheet.", worksheet


async def run_project_planning_ai_assist(
    req: ProjectPlanningAiAssistRequest,
) -> ProjectPlanningAiAssistResponse:
    settings = get_orchestration_settings()
    history = _history_pairs(req)
    composed = f"{_system_prompt(req)}\n\n---\n\nUser request:\n{_build_user_message(req)}"
    raw_reply = await direct_chat_reply(composed, history, settings)
    visible, worksheet = _extract_worksheet_from_reply(raw_reply)
    return ProjectPlanningAiAssistResponse(
        reply=visible,
        worksheet=worksheet,
        worksheetUpdated=worksheet is not None,
    )
