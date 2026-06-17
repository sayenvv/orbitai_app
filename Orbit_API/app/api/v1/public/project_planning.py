from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.public.auth import require_chat_user
from app.core.config import settings
from app.models import User
from app.services.project_planning.json_store import (
    list_template_project_ids,
    load_project_document,
    save_project_document,
)
from clovai_apps.project_planning.ai_assist_schemas import (
    ProjectPlanningAiAssistRequest,
    ProjectPlanningAiAssistResponse,
)
from clovai_apps.project_planning.schemas import ProjectPlanningDocument, ProjectPlanningSaveResponse
from app.services.code_workspace.sse import code_workspace_sse_response

router = APIRouter(prefix="/apps/project-planning", tags=["project-planning"])


@router.post("/ai-assist", response_model=ProjectPlanningAiAssistResponse)
async def project_planning_ai_assist(
    body: ProjectPlanningAiAssistRequest,
    _user: User = Depends(require_chat_user),
):
    from app.services.project_planning.ai_assist import run_project_planning_ai_assist

    try:
        return await run_project_planning_ai_assist(body)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI assist failed: {exc}",
        ) from exc


@router.post("/ai-assist/stream")
async def project_planning_ai_assist_stream(
    body: ProjectPlanningAiAssistRequest,
    _user: User = Depends(require_chat_user),
):
    from app.services.project_planning.ai_assist import stream_project_planning_ai_assist

    return code_workspace_sse_response(stream_project_planning_ai_assist(body))


@router.get("/templates")
def project_planning_list_templates(_user: User = Depends(require_chat_user)):
    if not settings.project_planning_persistence_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project planning persistence is disabled on this server.",
        )
    return {"projectIds": list_template_project_ids()}


@router.get("/projects/{project_id}", response_model=ProjectPlanningDocument)
def project_planning_get_project(project_id: str, user: User = Depends(require_chat_user)):
    if not settings.project_planning_persistence_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project planning persistence is disabled on this server.",
        )

    document = load_project_document(user.id, project_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return document


@router.put("/projects/{project_id}", response_model=ProjectPlanningSaveResponse)
def project_planning_save_project(
    project_id: str,
    body: ProjectPlanningDocument,
    user: User = Depends(require_chat_user),
):
    if not settings.project_planning_persistence_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project planning persistence is disabled on this server.",
        )
    if body.id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project id in body must match the URL.",
        )

    try:
        target, updated_at = save_project_document(user.id, body)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save project JSON: {exc}",
        ) from exc

    from pathlib import Path

    relative = target.relative_to(Path.cwd())
    return ProjectPlanningSaveResponse(
        projectId=project_id,
        relativePath=str(relative),
        updatedAt=updated_at,
    )
