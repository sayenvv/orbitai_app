from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.public.auth import require_chat_user
from app.db.session import get_db
from app.models import User
from app.services.photo_studio.generation_store import (
    delete_user_generation,
    get_user_generation,
    list_user_generations,
    persist_generation_batch,
    serialize_generation,
)
from app.services.photo_studio.workspace_store import (
    create_workspace,
    delete_workspace,
    get_workspace,
    list_workspaces,
    serialize_workspace,
    update_workspace,
)
from app.services.rag.document_store import get_user_document
from clovai_apps.photo_studio.schemas import (
    PhotoStudioAssetSummary,
    PhotoStudioGenerateRequest,
    PhotoStudioGenerateResponse,
    PhotoStudioGenerationListResponse,
    PhotoStudioGeneratedItem,
    PhotoStudioOptionsResponse,
)
from clovai_apps.photo_studio.service import get_photo_studio_options
from clovai_apps.photo_studio.workspace_schemas import (
    PhotoStudioWorkspaceCreateRequest,
    PhotoStudioWorkspaceListResponse,
    PhotoStudioWorkspaceResponse,
    PhotoStudioWorkspaceUpdateRequest,
)
from clovai_apps.photo_studio.canvas_export_schemas import (
    PhotoStudioCanvasExportPayload,
    PhotoStudioCanvasExportRequest,
    PhotoStudioCanvasExportResponse,
)
from clovai_apps.photo_studio.design_schemas import PhotoStudioDesignListResponse
from clovai_apps.shared.assets import ASSET_KIND_METADATA_KEY, is_image_upload

router = APIRouter(prefix="/apps/photo-studio", tags=["photo-studio"])


def _resolve_reference_asset(
    db: Session,
    user: User,
    asset_id: str | None,
    api_base_path: str = "/api",
) -> tuple[uuid.UUID | None, str | None]:
    if not asset_id:
        return None, None

    try:
        document_id = uuid.UUID(asset_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assetId.",
        ) from exc

    document = get_user_document(db, user.id, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reference asset not found.")

    metadata = document.doc_metadata or {}
    is_image = metadata.get(ASSET_KIND_METADATA_KEY) == "image" or is_image_upload(
        content_type=document.mime_type,
        filename=document.original_filename,
    )
    if not is_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reference asset must be an image upload.",
        )

    download_url = f"{api_base_path}/files/{document.id}/download"
    return document.id, download_url


@router.get("/options", response_model=PhotoStudioOptionsResponse)
def photo_studio_options(_user: User = Depends(require_chat_user)):
    return get_photo_studio_options()


@router.get("/designs", response_model=PhotoStudioDesignListResponse)
def photo_studio_list_designs(
    workspace_id: uuid.UUID | None = Query(default=None, alias="workspaceId"),
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    from app.services.photo_studio.design_store import list_photo_studio_designs

    return list_photo_studio_designs(db, user.id, workspace_id=workspace_id)


@router.get("/workspaces", response_model=PhotoStudioWorkspaceListResponse)
def photo_studio_list_workspaces(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    return PhotoStudioWorkspaceListResponse(data=list_workspaces(db, user.id, limit=limit))


@router.post("/workspaces", response_model=PhotoStudioWorkspaceResponse, status_code=status.HTTP_201_CREATED)
def photo_studio_create_workspace(
    body: PhotoStudioWorkspaceCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    return create_workspace(db, user.id, body)


@router.get("/workspaces/{workspace_id}", response_model=PhotoStudioWorkspaceResponse)
def photo_studio_get_workspace(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    row = get_workspace(db, user.id, workspace_id, touch=True)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
    return serialize_workspace(row)


@router.get("/canvas-export", response_model=PhotoStudioCanvasExportPayload)
def photo_studio_get_canvas_json(
    workspace_id: uuid.UUID | None = Query(default=None, alias="workspaceId"),
    draft_id: str | None = Query(default=None, alias="draftId"),
    user: User = Depends(require_chat_user),
):
    from app.core.config import settings
    from app.services.photo_studio.canvas_json_export import load_canvas_layers_json

    if not settings.photo_studio_canvas_export_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Canvas JSON export is disabled on this server.",
        )
    if not workspace_id and not draft_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide workspaceId or draftId.",
        )

    payload = load_canvas_layers_json(
        user.id,
        workspace_id=str(workspace_id) if workspace_id else None,
        draft_id=draft_id,
    )
    if payload is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canvas JSON not found.")
    return payload


@router.post("/canvas-export", response_model=PhotoStudioCanvasExportResponse)
def photo_studio_export_canvas_json(
    body: PhotoStudioCanvasExportRequest,
    user: User = Depends(require_chat_user),
):
    from app.core.config import settings
    from app.services.photo_studio.canvas_json_export import save_canvas_layers_json

    if not settings.photo_studio_canvas_export_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Canvas JSON export is disabled on this server.",
        )
    try:
        return save_canvas_layers_json(user.id, body)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write canvas JSON: {exc}",
        ) from exc


@router.put("/workspaces/{workspace_id}", response_model=PhotoStudioWorkspaceResponse)
def photo_studio_update_workspace(
    workspace_id: uuid.UUID,
    body: PhotoStudioWorkspaceUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    updated = update_workspace(db, user.id, workspace_id, body)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
    return updated


@router.delete("/workspaces/{workspace_id}")
def photo_studio_delete_workspace(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    if not delete_workspace(db, user.id, workspace_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
    return {"ok": True}


@router.post("/generate", response_model=PhotoStudioGenerateResponse, status_code=status.HTTP_201_CREATED)
def photo_studio_generate(
    body: PhotoStudioGenerateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    reference_asset_id, reference_image_url = _resolve_reference_asset(db, user, body.asset_id)
    variants = persist_generation_batch(
        db,
        user.id,
        body,
        reference_asset_id=reference_asset_id,
        reference_image_url=reference_image_url,
    )
    batch_id = variants[0].batch_id if variants else ""
    return PhotoStudioGenerateResponse(batch_id=batch_id or "", variants=variants)


@router.get("/generations", response_model=PhotoStudioGenerationListResponse)
def photo_studio_list_generations(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    return PhotoStudioGenerationListResponse(data=list_user_generations(db, user.id, limit=limit))


@router.get("/generations/{generation_id}", response_model=PhotoStudioGeneratedItem)
def photo_studio_get_generation(
    generation_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    row = get_user_generation(db, user.id, generation_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found.")
    return serialize_generation(row)


@router.delete("/generations/{generation_id}")
def photo_studio_delete_generation(
    generation_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    row = get_user_generation(db, user.id, generation_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found.")
    delete_user_generation(db, row)
    return {"ok": True}


@router.get("/assets", response_model=list[PhotoStudioAssetSummary])
def photo_studio_list_assets(
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    from app.services.rag.document_store import list_user_documents

    assets: list[PhotoStudioAssetSummary] = []
    for document in list_user_documents(db, user.id):
        metadata = document.get("metadata") or {}
        mime_type = document.get("mime_type")
        filename = document.get("original_filename")
        is_image = metadata.get(ASSET_KIND_METADATA_KEY) == "image" or is_image_upload(
            content_type=mime_type,
            filename=filename,
        )
        if not is_image:
            continue

        created_at = document.get("created_at")
        assets.append(
            PhotoStudioAssetSummary(
                id=str(document["id"]),
                name=filename or "Image",
                mime_type=mime_type,
                download_url=f"/api/files/{document['id']}/download",
                created_at=created_at.isoformat() if created_at else None,
            )
        )
    return assets
