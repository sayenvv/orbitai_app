from __future__ import annotations

import uuid

from app.services.code_workspace.code_review import validate_source_syntax
from app.services.code_workspace.file_resolver import find_file_node
from app.services.code_workspace.file_store import node_relative_path, read_file_content
from app.services.code_workspace.project_store import get_project, parse_project_state
from langchain_core.messages import HumanMessage, SystemMessage
from orbit_orchestration.config import get_orchestration_settings
from orbit_orchestration.langchain.llm_factory import create_chat_model
from sqlalchemy.orm import Session


_REVIEWER_PROMPT = (
    "You are a strict code reviewer for Clovops IDE.\n"
    "Given a user request, file path, syntax-check result, and full file content:\n"
    "- Flag logic bugs, missing imports, unsafe patterns, and incomplete edits.\n"
    "- If syntax already failed, focus on how to fix it.\n"
    "- Reply in 2–4 short bullet points. Start with PASS or FAIL on the first line."
)


async def review_code_workspace_file(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    *,
    file_id: str,
    user_request: str = "",
) -> dict:
    row = get_project(db, user_id, project_id)
    state = parse_project_state(row.state)
    node = find_file_node(state.nodes, file_id=file_id)
    file_path = node_relative_path(state.nodes, node.id)
    content = read_file_content(db, user_id, project_id, state.nodes, node.id)

    syntax = validate_source_syntax(
        content,
        language=node.language,
        file_path=file_path,
    )
    syntax_ok = bool(syntax.get("ok"))
    syntax_errors = list(syntax.get("errors") or [])

    review_input = (
        f"User request:\n{user_request.strip() or 'Apply a safe code update.'}\n\n"
        f"File: {file_path}\n"
        f"Language: {node.language or 'unknown'}\n"
        f"Syntax OK: {syntax_ok}\n"
        f"Syntax errors: {syntax_errors}\n\n"
        f"File content:\n```\n{content[:12000]}\n```"
    )

    llm_summary = ""
    llm_passed = syntax_ok
    try:
        llm = create_chat_model(get_orchestration_settings())
        response = await llm.ainvoke(
            [
                SystemMessage(content=_REVIEWER_PROMPT),
                HumanMessage(content=review_input),
            ]
        )
        raw = response.content
        if isinstance(raw, list):
            llm_summary = "".join(
                str(block.get("text") or "") if isinstance(block, dict) else str(block)
                for block in raw
            )
        else:
            llm_summary = str(raw or "")
        first_line = (llm_summary.splitlines()[0] if llm_summary else "").strip().upper()
        if first_line.startswith("FAIL"):
            llm_passed = False
        elif first_line.startswith("PASS"):
            llm_passed = syntax_ok
    except Exception as exc:
        llm_summary = f"Reviewer could not run: {exc}"
        llm_passed = syntax_ok

    return {
        "fileId": node.id,
        "filePath": file_path,
        "syntaxOk": syntax_ok,
        "passed": syntax_ok and llm_passed,
        "issues": syntax_errors,
        "summary": llm_summary.strip() or ("Syntax check passed." if syntax_ok else "Syntax errors found."),
    }
