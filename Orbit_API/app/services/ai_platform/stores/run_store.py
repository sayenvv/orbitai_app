"""Workflow run persistence helpers."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.ai_platform import (
    PlatformAgentRun,
    PlatformArtifact,
    PlatformExecutionLog,
    PlatformWorkflowRun,
)


class RunStore:
    def create_run(
        self,
        db: Session,
        *,
        user_id: uuid.UUID,
        prompt: str,
        workflow_config_id: uuid.UUID | None,
        workspace_path: str,
    ) -> PlatformWorkflowRun:
        row = PlatformWorkflowRun(
            id=uuid.uuid4(),
            user_id=user_id,
            workflow_config_id=workflow_config_id,
            status="running",
            current_stage="intent_classification",
            input_prompt=prompt,
            workspace_path=workspace_path,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    def log(
        self,
        db: Session,
        *,
        workflow_run_id: uuid.UUID,
        stage: str,
        log_type: str,
        message: str,
        payload: dict[str, Any] | None = None,
    ) -> PlatformExecutionLog:
        row = PlatformExecutionLog(
            id=uuid.uuid4(),
            workflow_run_id=workflow_run_id,
            stage=stage,
            log_type=log_type,
            message=message,
            payload=payload or {},
        )
        db.add(row)
        db.commit()
        return row

    def start_agent_run(
        self,
        db: Session,
        *,
        workflow_run_id: uuid.UUID,
        agent_name: str,
        role_key: str,
        stage: str,
        input_json: dict[str, Any],
    ) -> PlatformAgentRun:
        row = PlatformAgentRun(
            id=uuid.uuid4(),
            workflow_run_id=workflow_run_id,
            agent_name=agent_name,
            role_key=role_key,
            stage=stage,
            input_json=input_json,
            status="running",
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    def finish_agent_run(
        self,
        db: Session,
        row: PlatformAgentRun,
        *,
        output_json: dict[str, Any] | None,
        token_input: int,
        token_output: int,
        status: str = "completed",
        error: str | None = None,
    ) -> None:
        row.output_json = output_json
        row.token_input = token_input
        row.token_output = token_output
        row.status = status
        row.error = error
        row.completed_at = datetime.now(UTC)
        db.add(row)
        db.commit()

    def complete_run(
        self,
        db: Session,
        row: PlatformWorkflowRun,
        *,
        status: str,
        summary: str | None = None,
        artifact_url: str | None = None,
        token_input: int = 0,
        token_output: int = 0,
    ) -> None:
        row.status = status
        row.result_summary = summary
        row.artifact_url = artifact_url
        row.token_input = token_input
        row.token_output = token_output
        row.completed_at = datetime.now(UTC)
        db.add(row)
        db.commit()

    def save_artifact(
        self,
        db: Session,
        *,
        workflow_run_id: uuid.UUID,
        file_name: str,
        blob_url: str,
        size_bytes: int,
    ) -> PlatformArtifact:
        row = PlatformArtifact(
            id=uuid.uuid4(),
            workflow_run_id=workflow_run_id,
            artifact_type="zip",
            file_name=file_name,
            blob_url=blob_url,
            size_bytes=size_bytes,
        )
        db.add(row)
        db.commit()
        return row
