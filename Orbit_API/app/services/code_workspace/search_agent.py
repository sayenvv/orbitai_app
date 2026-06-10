from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, SystemMessage
from langgraph.prebuilt import create_react_agent

from app.db.session import SessionLocal
from app.services.code_workspace.agent_tools import build_code_workspace_agent_tools
from app.services.code_workspace.reviewer import review_code_workspace_file
from clovai_apps.code_workspace.schemas import CodeWorkspaceAgentSearchRequest
from orbit_orchestration.config import get_orchestration_settings
from orbit_orchestration.domain.message_text import sanitize_for_chat_ui
from orbit_orchestration.langchain.llm_factory import create_chat_model

_EDITOR_PROMPT = (
    "You are Clovops, an IDE coding agent for a code workspace.\n"
    "Workflow for build/update/fix requests:\n"
    "1. search_code_workspace_files — locate the right file(s).\n"
    "2. read_code_workspace_file — load full file context (required before editing).\n"
    "3. write_code_workspace_file — save the complete updated file.\n"
    "Rules:\n"
    "- Only edit files you have read in this turn.\n"
    "- write_code_workspace_file must contain the entire file, not a diff.\n"
    "- After saving, briefly tell the user what changed.\n"
    "- A separate reviewer agent validates syntax after each save.\n"
    "- For pure search/explain requests, search + read may be enough — do not write.\n"
    "Keep replies concise."
)


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
        return "".join(parts)
    return str(content)


def _history_to_messages(history: list[tuple[str, str]]) -> list:
    messages: list = []
    for role, content in history[-8:]:
        if role == "user":
            messages.append(HumanMessage(content=content))
        else:
            messages.append(AIMessage(content=content))
    return messages


def _build_user_message(req: CodeWorkspaceAgentSearchRequest, *, project_title: str) -> str:
    parts = [req.message.strip(), f"\nProject: {project_title}"]
    if req.active_file_path:
        parts.append(f"Active file: {req.active_file_path}")
    elif req.active_file_id:
        parts.append(f"Active file id: {req.active_file_id}")
    return "\n".join(parts)


def _parse_tool_json(output: Any) -> dict[str, Any] | None:
    if output is None:
        return None
    raw = output.content if hasattr(output, "content") else output
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return None
    return raw if isinstance(raw, dict) else None


def _parse_search_matches(output: Any) -> list[dict[str, Any]]:
    payload = _parse_tool_json(output)
    if not payload:
        return []
    results = payload.get("results")
    if not isinstance(results, list):
        return []
    return [item for item in results if isinstance(item, dict)]


def _parse_write_result(output: Any) -> dict[str, Any] | None:
    payload = _parse_tool_json(output)
    if not payload or not payload.get("fileId"):
        return None
    return payload


async def _run_reviewer(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    file_id: str,
    *,
    user_request: str,
) -> dict[str, Any]:
    db = SessionLocal()
    try:
        return await review_code_workspace_file(
            db,
            user_id,
            project_id,
            file_id=file_id,
            user_request=user_request,
        )
    finally:
        db.close()


async def stream_code_workspace_search_agent(
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    body: CodeWorkspaceAgentSearchRequest,
    *,
    project_title: str = "Project",
) -> AsyncIterator[dict[str, Any]]:
    yield {"type": "start", "project_id": str(project_id)}

    settings = get_orchestration_settings()
    llm = create_chat_model(settings)
    tools = build_code_workspace_agent_tools(user_id, str(project_id))
    llm = llm.bind_tools(tools)
    graph = create_react_agent(
        llm,
        tools,
        prompt=SystemMessage(content=_EDITOR_PROMPT),
    )

    history = [(turn.role, turn.content) for turn in body.history]
    messages = _history_to_messages(history)
    user_request = _build_user_message(body, project_title=project_title)
    messages.append(HumanMessage(content=user_request))

    seen_file_ids: set[str] = set()
    collected_files: list[dict[str, Any]] = []
    collected_edits: list[dict[str, Any]] = []
    collected_reviews: list[dict[str, Any]] = []
    full = ""

    try:
        async for event in graph.astream_events(
            {"messages": messages},
            version="v2",
            config={"recursion_limit": 18},
        ):
            event_type = event.get("event")
            if event_type == "on_tool_end":
                tool_name = str(event.get("name") or "")
                output = event.get("data", {}).get("output")

                if "search_code_workspace_files" in tool_name:
                    new_matches: list[dict[str, Any]] = []
                    for match in _parse_search_matches(output):
                        file_id = str(match.get("fileId") or match.get("file_id") or "")
                        if not file_id or file_id in seen_file_ids:
                            continue
                        seen_file_ids.add(file_id)
                        collected_files.append(match)
                        new_matches.append(match)
                    if new_matches:
                        yield {"type": "files", "files": new_matches}
                    continue

                if "write_code_workspace_file" in tool_name:
                    write_result = _parse_write_result(output)
                    if write_result:
                        edit_payload = {
                            "fileId": write_result.get("fileId"),
                            "filePath": write_result.get("filePath"),
                            "syntaxOk": write_result.get("syntaxOk", True),
                        }
                        collected_edits.append(edit_payload)
                        yield {"type": "edit", "edit": edit_payload}

                        file_id = str(write_result.get("fileId") or "")
                        if file_id:
                            review = await _run_reviewer(
                                user_id,
                                project_id,
                                file_id,
                                user_request=body.message.strip(),
                            )
                            collected_reviews.append(review)
                            yield {"type": "review", "review": review}
                    continue

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
            yield {"type": "token", "content": token}

        text = sanitize_for_chat_ui(full) or (
            "I could not complete the request. Try being more specific about the file or change."
        )
        yield {
            "type": "done",
            "content": text,
            "files": collected_files,
            "edits": collected_edits,
            "reviews": collected_reviews,
        }
    except Exception as exc:
        yield {"type": "error", "detail": str(exc)}
