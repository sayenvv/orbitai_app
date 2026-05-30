import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.api.v1.public.auth import require_chat_user
from app.db.session import get_db
from app.models import User
from app.schemas import LibraryGeneratedFileResponse
from app.services.library_insights import generate_upload_insights
from app.services.library_store import (
    _serialize_generated,
    delete_user_generated_file,
    get_user_generated_file,
    list_user_generated_files,
)

router = APIRouter(prefix="/library", tags=["library"])


@router.post("/uploads/{document_id}/insights", response_model=LibraryGeneratedFileResponse)
async def create_upload_insights(
    document_id: uuid.UUID,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    try:
        payload = await generate_upload_insights(db, user=user, document_id=document_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return LibraryGeneratedFileResponse(**payload)


@router.get("/generated", response_model=list[LibraryGeneratedFileResponse])
def list_generated_files(
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    return [LibraryGeneratedFileResponse(**item) for item in list_user_generated_files(db, user.id)]


@router.get("/generated/{file_id}", response_model=LibraryGeneratedFileResponse)
def get_generated_file(
    file_id: uuid.UUID,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    row = get_user_generated_file(db, user.id, file_id)
    if not row:
        raise HTTPException(status_code=404, detail="Generated file not found")
    return LibraryGeneratedFileResponse(**_serialize_generated(row))


@router.get("/generated/{file_id}/download")
def download_generated_file(
    file_id: uuid.UUID,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    row = get_user_generated_file(db, user.id, file_id)
    if not row:
        raise HTTPException(status_code=404, detail="Generated file not found")

    safe_title = "".join(ch if ch.isalnum() or ch in " -_" else "_" for ch in row.title).strip()
    filename = f"{safe_title or 'generated'}.txt"
    body = f"{row.title}\n\n{row.preview}".strip()

    return PlainTextResponse(
        content=body,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/generated/{file_id}")
def delete_generated_file(
    file_id: uuid.UUID,
    user: User = Depends(require_chat_user),
    db: Session = Depends(get_db),
):
    row = get_user_generated_file(db, user.id, file_id)
    if not row:
        raise HTTPException(status_code=404, detail="Generated file not found")
    delete_user_generated_file(db, row)
    return {"ok": True}
