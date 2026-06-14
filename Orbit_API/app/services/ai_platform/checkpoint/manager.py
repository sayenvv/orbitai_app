"""Persist workflow checkpoints after each stage."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.ai_platform import PlatformCheckpoint
from app.services.ai_platform.tools.file_tools import snapshot_metadata, write_json
from pathlib import Path


class CheckpointManager:
    def save(
        self,
        db: Session,
        *,
        workflow_run_id: uuid.UUID,
        stage: str,
        checkpoint_data: dict[str, Any],
        workspace_path: str | None = None,
        retry_count: int = 0,
    ) -> PlatformCheckpoint:
        snapshot_path = None
        if workspace_path:
            snap = Path(workspace_path) / ".checkpoints" / f"{stage}.json"
            payload = {"stage": stage, "data": checkpoint_data, "snapshot": snapshot_metadata(workspace_path)}
            write_json(snap, payload)
            snapshot_path = str(snap)

        row = PlatformCheckpoint(
            id=uuid.uuid4(),
            workflow_run_id=workflow_run_id,
            stage=stage,
            checkpoint_data=checkpoint_data,
            workspace_snapshot_path=snapshot_path,
            status="saved",
            retry_count=retry_count,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
