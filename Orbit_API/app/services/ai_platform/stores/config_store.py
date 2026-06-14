"""Load and seed platform configuration from the database."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.ai_platform import (
    PlatformAgentConfig,
    PlatformToolConfig,
    PlatformWorkflowConfig,
)
from app.services.ai_platform.seeds.defaults import (
    DEFAULT_AGENT_CONFIGS,
    DEFAULT_TOOL_CONFIGS,
    DEFAULT_WORKFLOW_CONFIG,
)


def ensure_default_platform_configs(db: Session) -> None:
    if db.query(PlatformAgentConfig).count() == 0:
        for item in DEFAULT_AGENT_CONFIGS:
            db.add(
                PlatformAgentConfig(
                    id=uuid.uuid4(),
                    name=item["name"],
                    role_key=item["role_key"],
                    description=item.get("description", ""),
                    system_prompt=item["system_prompt"],
                    model_provider=item.get("model_provider", "openai"),
                    model_name=item.get("model_name", "gpt-4o-mini"),
                    temperature=item.get("temperature", 0.2),
                    max_tokens=item.get("max_tokens", 4096),
                    tools=item.get("tools", []),
                    context_policy=item.get("context_policy", {}),
                    retry_policy=item.get("retry_policy", {"max_retries": 2}),
                    allowed_file_access=item.get("allowed_file_access", {}),
                    workflow_stage=item.get("workflow_stage"),
                    enabled=True,
                )
            )

    if db.query(PlatformToolConfig).count() == 0:
        for item in DEFAULT_TOOL_CONFIGS:
            db.add(
                PlatformToolConfig(
                    id=uuid.uuid4(),
                    name=item["name"],
                    tool_type=item["tool_type"],
                    description=item.get("description", ""),
                    enabled=True,
                    permissions=item.get("permissions", {}),
                    config_json=item.get("config_json", {}),
                )
            )

    if db.query(PlatformWorkflowConfig).count() == 0:
        db.add(
            PlatformWorkflowConfig(
                id=uuid.uuid4(),
                name=DEFAULT_WORKFLOW_CONFIG["name"],
                intent=DEFAULT_WORKFLOW_CONFIG["intent"],
                stages_json=DEFAULT_WORKFLOW_CONFIG["stages_json"],
                enabled=True,
                require_human_approval=DEFAULT_WORKFLOW_CONFIG["require_human_approval"],
                max_fix_attempts=DEFAULT_WORKFLOW_CONFIG["max_fix_attempts"],
            )
        )

    db.commit()
    _ensure_agent_token_limits(db)
    _ensure_agent_retry_policies(db)


_ROLE_MIN_TOKENS: dict[str, int] = {
    "code_generation": 32768,
    "fix": 16384,
    "architecture": 16384,
}


def _ensure_agent_token_limits(db: Session) -> None:
    updated = False
    for role_key, minimum in _ROLE_MIN_TOKENS.items():
        row = get_agent_config_by_role(db, role_key)
        if row is None or row.max_tokens >= minimum:
            continue
        row.max_tokens = minimum
        db.add(row)
        updated = True
    if updated:
        db.commit()


_ROLE_RETRY_POLICIES: dict[str, dict] = {
    "code_generation": {"max_retries": 4, "timeout_seconds": 300},
    "fix": {"max_retries": 4, "timeout_seconds": 300},
    "review": {"max_retries": 2, "timeout_seconds": 300},
    "documentation": {"max_retries": 2, "timeout_seconds": 300},
    "validation": {"max_retries": 2, "timeout_seconds": 300},
    "architecture": {"max_retries": 2, "timeout_seconds": 300},
}


def _ensure_agent_retry_policies(db: Session) -> None:
    updated = False
    for role_key, policy in _ROLE_RETRY_POLICIES.items():
        row = get_agent_config_by_role(db, role_key)
        if row is None:
            continue
        current = dict(row.retry_policy or {})
        desired = {**current, **policy}
        if current == desired:
            continue
        row.retry_policy = desired
        db.add(row)
        updated = True
    if updated:
        db.commit()
    _ensure_code_generation_design_prompt(db)


_CODEGEN_DESIGN_SNIPPET = (
    "Design rules: production-quality UI, generous whitespace, consistent typography, responsive layout, "
    "accessible color contrast, no placeholder broken images (use CSS gradients instead). "
    "For static HTML/CSS: NEVER rename existing CSS classes — only change copy, theme variables, and content."
)


def _ensure_code_generation_design_prompt(db: Session) -> None:
    row = get_agent_config_by_role(db, "code_generation")
    if row is None or _CODEGEN_DESIGN_SNIPPET in row.system_prompt:
        return
    row.system_prompt = f"{row.system_prompt.rstrip()} {_CODEGEN_DESIGN_SNIPPET}"
    db.add(row)
    db.commit()


def get_agent_config_by_role(db: Session, role_key: str) -> PlatformAgentConfig | None:
    return (
        db.query(PlatformAgentConfig)
        .filter(PlatformAgentConfig.role_key == role_key, PlatformAgentConfig.enabled.is_(True))
        .order_by(PlatformAgentConfig.created_at.asc())
        .first()
    )


def get_workflow_for_intent(db: Session, intent: str) -> PlatformWorkflowConfig | None:
    return (
        db.query(PlatformWorkflowConfig)
        .filter(
            PlatformWorkflowConfig.intent == intent,
            PlatformWorkflowConfig.enabled.is_(True),
        )
        .order_by(PlatformWorkflowConfig.created_at.asc())
        .first()
    )
