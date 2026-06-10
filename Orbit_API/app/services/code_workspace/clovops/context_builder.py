from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.services.code_workspace.agent_tools import read_code_workspace_file_for_agent


def build_file_context(
    db: Session,
    user_id: uuid.UUID,
    project_id: uuid.UUID,
    file_ids: list[str],
    *,
    max_chars_per_file: int = 8000,
    max_files: int = 4,
) -> list[dict]:
    """Context builder — read only the files needed for the LLM."""
    context_files: list[dict] = []
    for file_id in file_ids[:max_files]:
        try:
            payload = read_code_workspace_file_for_agent(
                db,
                user_id,
                project_id,
                file_id=file_id,
                max_chars=max_chars_per_file,
            )
            context_files.append(payload)
        except Exception:
            continue
    return context_files


def format_context_for_llm(context_files: list[dict]) -> str:
    if not context_files:
        return "No file context loaded."

    parts: list[str] = []
    for item in context_files:
        parts.append(
            f"### {item.get('filePath')} (id: {item.get('fileId')})\n"
            f"```{item.get('language') or ''}\n"
            f"{item.get('content', '')}\n"
            f"```"
        )
    return "\n\n".join(parts)
