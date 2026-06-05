from __future__ import annotations

import re

from orbit_orchestration.domain.constants import HITL_PAUSE_SENTINEL

_TOOL_CALL_MARKERS = (
    '"name": "summarize_text"',
    '"name":"summarize_text"',
    '"name": "generate_image"',
    '"parameters":',
    "summarize_text",
)

_NOISE_SUBSTRINGS = (
    "FunctionExecutionResult(",
    "validation error for summarize_text",
    "[Internal routing only",
    "[Orchestrator routing]",
    "Human response:",
    "Continue the workflow",
    "If image work is done, reply TERMINATE",
    "For further information visit https://errors.pydantic.dev",
    "input_value={'description'",
    "call_id='",
    "is_error=True",
    "**Selected agents:**",
    "**Primary agent:**",
    "**Intent:**",
    "**Topics:**",
    "**Waiting for your input:**",
    "**Waiting for you:**",
    "Enter your response:",
    "[Awaiting human]",
)

def looks_like_tool_call_json(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    if any(marker in stripped for marker in _TOOL_CALL_MARKERS):
        return True
    if stripped.startswith("{") and ("parameters" in stripped or "summarize_text" in stripped):
        return True
    return False


def is_noise_content(text: str) -> bool:
    stripped = text.strip()
    if not stripped or stripped == HITL_PAUSE_SENTINEL:
        return True
    if looks_like_tool_call_json(stripped):
        return True
    if any(part in stripped for part in _NOISE_SUBSTRINGS):
        return True
    if re.match(r"^\[[\w_]+\]\s*$", stripped):
        return True
    if stripped.startswith("{") and '"batch_id"' in stripped:
        return True
    return False


def is_safe_stream_token(chunk: str, *, accumulated: str = "") -> bool:
    """Drop SSE token chunks that are tool-call JSON fragments."""
    if not chunk:
        return False
    probe = (accumulated + chunk).strip()
    if looks_like_tool_call_json(probe):
        return False
    if is_noise_content(chunk) and chunk.strip().startswith("{"):
        return False
    return True


def is_valid_chat_ui_content(text: str) -> bool:
    """True when text is safe to stream to the chat markdown renderer."""
    cleaned = sanitize_for_chat_ui(text)
    if not cleaned:
        return False
    if is_noise_content(cleaned):
        return False
    return True


def strip_autogen_artifacts(raw: str) -> str:
    text = raw.replace("\r\n", "\n")
    text = re.sub(r"\[FunctionExecutionResult\([\s\S]*?\)\]", "", text)
    text = re.sub(r"```[\s\S]*?```", lambda m: "" if "FunctionExecutionResult" in m.group(0) else m.group(0), text)
    return text


def clean_line(line: str) -> str:
    line = line.strip()
    line = re.sub(
        r"^\[(web_search_agent|research_agent|job_search_agent|math_agent|assistant)\]\s*",
        "",
        line,
    )
    return line.strip()


def extract_display_text(raw: str) -> str:
    if not raw:
        return ""
    text = strip_autogen_artifacts(raw)
    lines: list[str] = []
    for line in text.splitlines():
        cleaned = clean_line(line)
        if cleaned and not is_noise_content(cleaned):
            lines.append(cleaned)
    return "\n\n".join(lines).strip()


def sanitize_for_chat_ui(raw: str) -> str:
    """Final text for SSE token stream + DB assistant message."""
    return extract_display_text(raw)
