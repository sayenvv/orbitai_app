from __future__ import annotations

import json
import re
import uuid

from langchain_core.messages import HumanMessage, SystemMessage

from app.db.session import SessionLocal
from app.services.code_workspace.agent_tools import (
    create_code_workspace_file_for_agent,
    write_code_workspace_file_for_agent,
)
from app.services.code_workspace.clovops.context_builder import format_context_for_llm
from orbit_orchestration.config import get_orchestration_settings
from orbit_orchestration.langchain.llm_factory import create_chat_model

_WRITER_PROMPT = (
    "You are the Code Writer Agent for Clovops IDE.\n"
    "Return JSON only:\n"
    "{\n"
    '  "summary": "what you changed",\n'
    '  "files": [\n'
    '    {"action": "update", "file_id": "...", "content": "FULL file content"},\n'
    '    {"action": "create", "name": "file.ts", "parent_path": "src", "language": "typescript", "content": "FULL file content"}\n'
    "  ]\n"
    "}\n"
    "Rules:\n"
    "- content must be the complete file, not a diff.\n"
    "- Apply every planned update/create.\n"
    "- Do not omit files from the plan."
)

_JSON_FENCE = re.compile(r"```(?:json)?\s*\n([\s\S]*?)\n```", re.IGNORECASE)


def _parse_writer_json(raw: str) -> dict:
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
    return {"summary": raw.strip(), "files": []}


def _context_by_id(context_files: list[dict]) -> dict[str, dict]:
    return {str(item.get("fileId")): item for item in context_files if item.get("fileId")}


async def run_code_writer(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    *,
    user_request: str,
    plan: str,
    context_files: list[dict],
    planned_files: list[str],
    plan_updates: list[dict],
    plan_creates: list[dict],
    session_context: str = "",
) -> tuple[str, list[dict]]:
    """Deterministic code writer — LLM emits full files, backend saves them."""
    settings = get_orchestration_settings()
    llm = create_chat_model(settings)
    by_id = _context_by_id(context_files)

    targets: list[dict] = []
    for item in plan_updates:
        file_id = str(item.get("file_id") or item.get("fileId") or "")
        if not file_id:
            continue
        ctx = by_id.get(file_id, {})
        targets.append(
            {
                "action": "update",
                "file_id": file_id,
                "file_path": ctx.get("filePath"),
                "goal": item.get("goal"),
                "current_content": ctx.get("content", ""),
            }
        )

    for file_id in planned_files:
        if any(target.get("file_id") == file_id for target in targets):
            continue
        ctx = by_id.get(file_id, {})
        targets.append(
            {
                "action": "update",
                "file_id": file_id,
                "file_path": ctx.get("filePath"),
                "goal": "Apply the user request",
                "current_content": ctx.get("content", ""),
            }
        )

    for item in plan_creates:
        targets.append(
            {
                "action": "create",
                "name": item.get("name"),
                "parent_path": item.get("parent_path", ""),
                "language": item.get("language"),
                "goal": item.get("goal"),
            }
        )

    if not targets:
        return "No files were selected to update or create.", []

    prompt = (
        f"{session_context}\n\n"
        f"User request:\n{user_request}\n\n"
        f"Plan:\n{plan}\n\n"
        f"Targets JSON:\n{json.dumps(targets, indent=2)}\n\n"
        f"Context:\n{format_context_for_llm(context_files)}"
    )

    response = await llm.ainvoke(
        [SystemMessage(content=_WRITER_PROMPT), HumanMessage(content=prompt)]
    )
    raw = response.content
    text = raw if isinstance(raw, str) else str(raw or "")
    parsed = _parse_writer_json(text)

    edits: list[dict] = []
    db = SessionLocal()
    try:
        for item in parsed.get("files") or []:
            if not isinstance(item, dict):
                continue
            action = str(item.get("action") or "update").lower()
            content = str(item.get("content") or "")
            if not content.strip():
                continue

            if action == "create":
                payload = create_code_workspace_file_for_agent(
                    db,
                    user_id,
                    project_id,
                    name=str(item.get("name") or "untitled.txt"),
                    content=content,
                    parent_path=str(item.get("parent_path") or "") or None,
                    parent_id=str(item.get("parent_id") or "") or None,
                    language=str(item.get("language") or "") or None,
                )
            else:
                file_id = str(item.get("file_id") or item.get("fileId") or "")
                if not file_id:
                    continue
                payload = write_code_workspace_file_for_agent(
                    db,
                    user_id,
                    project_id,
                    file_id=file_id,
                    content=content,
                )
            edits.append(payload)
    finally:
        db.close()

    summary = str(parsed.get("summary") or "").strip()
    if not summary and edits:
        paths = ", ".join(str(item.get("filePath")) for item in edits)
        summary = f"Updated project files: {paths}"
    if not edits:
        summary = summary or "The writer could not save file changes. Try a more specific file path."

    return summary, edits
