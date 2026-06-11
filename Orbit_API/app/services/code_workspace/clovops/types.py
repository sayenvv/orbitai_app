from __future__ import annotations

from typing import Any, Literal, TypedDict

ClovopsRequestType = Literal[
    "chat",
    "code_question",
    "code_edit",
    "bug_fix",
    "explain",
    "summarize",
    "terminal",
]

ClovopsPipelineStep = Literal[
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
]

ClovopsResponseMode = Literal["chat", "explain", "summarize"]

ClovopsPhase = Literal[
    "routing",
    "indexing",
    "search",
    "context",
    "planning",
    "writing",
    "review",
    "validation",
    "terminal",
    "responding",
]


class ClovopsGraphState(TypedDict, total=False):
    user_id: str
    project_id: str
    project_title: str
    user_request: str
    active_file_id: str | None
    active_file_path: str | None
    history: list[tuple[str, str]]

    request_type: ClovopsRequestType
    routing_reason: str
    pipeline: list[ClovopsPipelineStep]
    pipeline_completed: int
    last_pipeline_step: str
    response_mode: ClovopsResponseMode
    terminal_command: str | None
    search_query: str | None

    file_map: list[dict[str, Any]]
    search_results: list[dict[str, Any]]
    context_files: list[dict[str, Any]]
    session_context: str
    plan: str
    planned_files: list[str]
    plan_updates: list[dict[str, Any]]
    plan_creates: list[dict[str, Any]]

    edits: list[dict[str, Any]]
    last_edits: list[dict[str, Any]]
    reviews: list[dict[str, Any]]
    terminal_result: dict[str, Any] | None
    run_plan: str | None
    validation: dict[str, Any] | None

    response_text: str
    needs_fix: bool
    retry_count: int
    error: str | None
