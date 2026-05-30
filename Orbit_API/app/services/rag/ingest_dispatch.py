from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Literal

from fastapi import BackgroundTasks

from app.core.config import settings
from app.services.rag.ingest_job import run_ingest_job

IngestMode = Literal["celery", "background", "sync"]


@dataclass
class IngestDispatchResult:
    mode: IngestMode
    task_id: str | None = None


def _dispatch_celery(document_id: uuid.UUID, user_id: uuid.UUID) -> IngestDispatchResult:
    from app.worker.tasks import ingest_rag_document_task

    async_result = ingest_rag_document_task.delay(str(document_id), str(user_id))
    return IngestDispatchResult(mode="celery", task_id=async_result.id)


def dispatch_document_ingest(
    document_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    background_tasks: BackgroundTasks | None = None,
) -> IngestDispatchResult:
    mode = settings.rag_ingest_mode.strip().lower()

    if mode == "sync":
        run_ingest_job(document_id, user_id)
        return IngestDispatchResult(mode="sync")

    if mode in {"auto", "celery"}:
        try:
            return _dispatch_celery(document_id, user_id)
        except Exception as exc:
            if mode == "celery":
                raise RuntimeError(f"Celery broker unavailable: {exc}") from exc

    if background_tasks is not None:
        background_tasks.add_task(run_ingest_job, document_id, user_id)
        return IngestDispatchResult(mode="background")

    run_ingest_job(document_id, user_id)
    return IngestDispatchResult(mode="sync")
