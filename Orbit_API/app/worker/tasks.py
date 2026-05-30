from __future__ import annotations

import uuid

from app.worker.celery_app import celery_app
from app.services.rag.ingest_job import run_ingest_job


@celery_app.task(name="rag.ingest_document")
def ingest_rag_document_task(document_id: str, user_id: str) -> dict:
    run_ingest_job(uuid.UUID(document_id), uuid.UUID(user_id))
    return {"document_id": document_id}
