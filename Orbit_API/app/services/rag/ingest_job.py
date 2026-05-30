from __future__ import annotations

import logging
import uuid

from app.db.session import SessionLocal
from app.models import RagDocument, User
from app.services.rag.ingest import ingest_document

logger = logging.getLogger(__name__)


def run_ingest_job(document_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Run PDF ingest in a standalone DB session (Celery worker or BackgroundTasks)."""
    db = SessionLocal()
    try:
        document = db.query(RagDocument).filter(RagDocument.id == document_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if not document or not user:
            logger.warning("Ingest skipped: document=%s user=%s", document_id, user_id)
            return
        ingest_document(db, document, user, raise_on_error=False)
    except Exception:
        logger.exception("Ingest job failed for document=%s", document_id)
    finally:
        db.close()
