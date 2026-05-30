import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.api.v1.public.auth import require_chat_user
from app.db.session import get_db
from app.models import User
from app.services.library_store import delete_user_generated_file, get_user_generated_file

router = APIRouter(prefix="/library", tags=["library"])


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
