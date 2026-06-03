from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.public.auth import require_chat_user
from app.models import User
from clovai_apps import (
    APP_SLUG_PHOTO_STUDIO,
    CatalogAppSummary,
    find_app_by_id_or_slug,
    list_apps as list_catalog_apps,
    list_visible_apps,
    normalize_app_slug,
)

router = APIRouter(prefix="/apps", tags=["apps"])


@router.get("", response_model=list[CatalogAppSummary])
def list_apps(
    visible_only: bool = Query(default=True, alias="visibleOnly"),
    _user: User = Depends(require_chat_user),
):
    if visible_only:
        return list_visible_apps()
    return list_catalog_apps(visible_only=False)


@router.get("/by-slug/{slug}/context")
def get_app_context(
    slug: str,
    _user: User = Depends(require_chat_user),
):
    normalized = normalize_app_slug(slug)
    app = find_app_by_id_or_slug(normalized)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    return {
        "slug": normalized,
        "id": app.id,
        "name": app.name,
        "tier": app.tier,
        "launchAvailable": app.launch_available,
        "chatAppSlug": normalized,
        "endpoints": {
            "catalog": f"/api/apps/{app.id}",
            "files": "/api/files",
            "chatStream": "/api/multi-agent/runs/stream",
            **(
                {
                    "options": "/api/apps/photo-studio/options",
                    "workspaces": "/api/apps/photo-studio/workspaces",
                    "generate": "/api/apps/photo-studio/generate",
                    "generations": "/api/apps/photo-studio/generations",
                    "assets": "/api/apps/photo-studio/assets",
                }
                if normalized == APP_SLUG_PHOTO_STUDIO
                else {}
            ),
        },
    }


@router.get("/{id_or_slug}", response_model=CatalogAppSummary)
def get_app(
    id_or_slug: str,
    _user: User = Depends(require_chat_user),
):
    app = find_app_by_id_or_slug(id_or_slug)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    return app
