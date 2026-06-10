from __future__ import annotations


def build_session_context(
    *,
    history: list[tuple[str, str]],
    user_request: str,
    active_file_path: str | None = None,
    project_title: str = "Project",
) -> str:
    """Memory / session agent — compact prior-turn context for downstream agents."""
    lines = [f"Project: {project_title}"]
    if active_file_path:
        lines.append(f"Active file: {active_file_path}")

    recent = history[-6:]
    if recent:
        lines.append("Recent conversation:")
        for role, content in recent:
            snippet = content.strip().replace("\n", " ")[:240]
            if snippet:
                lines.append(f"- {role}: {snippet}")

    lines.append(f"Current request: {user_request.strip()}")
    return "\n".join(lines)
