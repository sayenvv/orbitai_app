import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.v1.public.auth import require_chat_user
from app.core.config import settings
from app.db.session import get_db
from app.models import Conversation, RagDocument, User
from app.schemas import PdfInspectResponse, RagDocumentListResponse, RagDocumentResponse
from app.services.rag.document_store import (
    delete_user_document,
    get_user_document,
    list_user_documents,
    serialize_document,
)
from app.services.rag.ingest import save_upload_file
from app.services.rag.ingest_dispatch import dispatch_document_ingest
from app.services.rag.limits import max_pages_for_plan
from app.services.rag.pdf_extract import count_pdf_pages

router = APIRouter(prefix="/files", tags=["files"])

PDF_MIME_TYPES = frozenset({"application/pdf", "application/x-pdf"})
IMAGE_MIME_TYPES = frozenset({"image/jpeg", "image/png"})
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png")


def _is_image_upload(upload: UploadFile) -> bool:
    content_type = (upload.content_type or "").lower()
    filename = (upload.filename or "").lower()
    if content_type in IMAGE_MIME_TYPES:
        return True
    return any(filename.endswith(ext) for ext in IMAGE_EXTENSIONS)


def _validate_pdf(upload: UploadFile) -> None:
    content_type = (upload.content_type or "").lower()
    filename = (upload.filename or "").lower()
    if content_type not in PDF_MIME_TYPES and not filename.endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )


def _inspect_pdf_bytes(data: bytes, plan: str) -> PdfInspectResponse:
    try:
        total_pages = count_pdf_pages(data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read PDF page count.",
        ) from exc

    page_limit = max_pages_for_plan(plan)
    pages_indexed = total_pages if page_limit is None else min(total_pages, page_limit)
    will_truncate = page_limit is not None and total_pages > page_limit

    return PdfInspectResponse(
        total_pages=total_pages,
        page_limit=page_limit,
        pages_indexed=pages_indexed,
        will_truncate=will_truncate,
        plan=plan.strip().lower(),
        )


def _validate_upload(upload: UploadFile) -> str:
    content_type = (upload.content_type or "").lower()
    if _is_image_upload(upload):
        return "image"
    if content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, JPEG, and PNG images are supported.",
        )
    _validate_pdf(upload)
    return "pdf"


@router.post("/inspect", response_model=PdfInspectResponse)
async def inspect_pdf(
    file: UploadFile = File(...),
    user: User = Depends(require_chat_user),
):
    _validate_pdf(file)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > settings.rag_max_file_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {settings.rag_max_file_bytes // (1024 * 1024)} MB.",
        )
    return _inspect_pdf_bytes(data, user.plan)


@router.get("", response_model=RagDocumentListResponse)
def list_files(
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    return RagDocumentListResponse(
        data=[RagDocumentResponse(**item) for item in list_user_documents(db, user.id)]
    )


@router.get("/{document_id}/download")
def download_file(
    document_id: uuid.UUID,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    document = get_user_document(db, user.id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    path = Path(document.storage_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path,
        media_type=document.mime_type or "application/pdf",
        filename=document.original_filename,
    )


@router.get("/{document_id}", response_model=RagDocumentResponse)
def get_file(
    document_id: uuid.UUID,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    document = get_user_document(db, user.id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return RagDocumentResponse(**serialize_document(document))


@router.post("/upload", response_model=RagDocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    conversation_id: uuid.UUID | None = Form(default=None),
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    upload_kind = _validate_upload(file)

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > settings.rag_max_file_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {settings.rag_max_file_bytes // (1024 * 1024)} MB.",
        )

    if conversation_id:
        conv = (
            db.query(Conversation)
            .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
            .first()
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

    document_id = uuid.uuid4()
    default_filename = "reference.png" if upload_kind == "image" else "document.pdf"
    filename = Path(file.filename or default_filename).name
    storage_path = save_upload_file(
        user_id=user.id,
        document_id=document_id,
        filename=filename,
        data=data,
    )

    if upload_kind == "image":
        document = RagDocument(
            id=document_id,
            user_id=user.id,
            conversation_id=conversation_id,
            original_filename=filename,
            mime_type=file.content_type or "image/jpeg",
            storage_path=str(storage_path),
            file_size_bytes=len(data),
            status="ready",
            page_count=1,
            pages_processed=0,
            chunk_count=0,
            doc_metadata={
                "asset_kind": "image",
                "photo_studio_reference": True,
            },
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        return RagDocumentResponse(**serialize_document(document))

    inspection = _inspect_pdf_bytes(data, user.plan)

    document = RagDocument(
        id=document_id,
        user_id=user.id,
        conversation_id=conversation_id,
        original_filename=filename,
        mime_type=file.content_type or "application/pdf",
        storage_path=str(storage_path),
        file_size_bytes=len(data),
        status="pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        dispatch = dispatch_document_ingest(
            document.id,
            user.id,
            background_tasks=background_tasks,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    document.doc_metadata = {
        **(document.doc_metadata or {}),
        "ingest_mode": dispatch.mode,
        "celery_task_id": dispatch.task_id,
        "total_pages": inspection.total_pages,
        "pages_indexed": inspection.pages_indexed,
        "pages_truncated": inspection.will_truncate,
        "plan_page_cap": inspection.page_limit,
    }
    if dispatch.mode != "sync":
        document.status = "processing"
    db.commit()
    db.refresh(document)

    if dispatch.mode == "sync" and document.status == "failed":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=document.error_message or "Ingest failed",
        )

    return RagDocumentResponse(**serialize_document(document))


@router.delete("/{document_id}")
def delete_file(
    document_id: uuid.UUID,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    document = get_user_document(db, user.id, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    delete_user_document(db, document)
    return {"ok": True}
