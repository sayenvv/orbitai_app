from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.v1.public.auth import require_chat_user
from app.core.config import settings
from app.db.session import get_db
from app.models import User
from app.services.code_workspace.deploy_store import deploy_project
from app.services.code_workspace.file_store import read_file_content, write_file_content
from app.services.code_workspace.search_agent import stream_code_workspace_search_agent
from app.services.code_workspace.search_store import search_project_files
from app.services.multi_agent_stream import sse_response
from app.services.code_workspace.settings_store import get_user_settings, update_user_settings
from app.services.code_workspace.project_store import (
    parse_project_state,
    add_project_node,
    create_project,
    delete_project,
    get_project,
    list_projects,
    serialize_project,
    update_project_metadata,
    update_project_node,
    update_project_structure,
)
from clovai_apps.code_workspace.schemas import (
    CodeWorkspaceAgentSearchRequest,
    CodeWorkspaceDeployRequest,
    CodeWorkspaceDeployResponse,
    CodeWorkspaceFileContentResponse,
    CodeWorkspaceFileContentUpdateRequest,
    CodeWorkspaceNodeCreateRequest,
    CodeWorkspaceNodeUpdateRequest,
    CodeWorkspaceProjectCreateRequest,
    CodeWorkspaceProjectListResponse,
    CodeWorkspaceProjectResponse,
    CodeWorkspaceProjectUpdateRequest,
    CodeWorkspaceSearchRequest,
    CodeWorkspaceSearchResponse,
    CodeWorkspaceSettingsResponse,
    CodeWorkspaceSettingsUpdateRequest,
    CodeWorkspaceStructureUpdateRequest,
)

router = APIRouter(prefix="/apps/code-workspace", tags=["code-workspace"])


def _ensure_enabled() -> None:
    if not settings.code_workspace_persistence_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Code workspace persistence is disabled on this server.",
        )


@router.get("/projects", response_model=CodeWorkspaceProjectListResponse)
def code_workspace_list_projects(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    return CodeWorkspaceProjectListResponse(data=list_projects(db, user.id, limit=limit))


@router.post("/projects", response_model=CodeWorkspaceProjectResponse, status_code=status.HTTP_201_CREATED)
def code_workspace_create_project(
    body: CodeWorkspaceProjectCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    return create_project(db, user.id, body)


@router.get("/projects/{project_id}", response_model=CodeWorkspaceProjectResponse)
def code_workspace_get_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    row = get_project(db, user.id, project_id)
    return serialize_project(row)


@router.patch("/projects/{project_id}", response_model=CodeWorkspaceProjectResponse)
def code_workspace_update_project(
    project_id: uuid.UUID,
    body: CodeWorkspaceProjectUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    return update_project_metadata(db, user.id, project_id, body)


@router.put("/projects/{project_id}/structure", response_model=CodeWorkspaceProjectResponse)
def code_workspace_update_structure(
    project_id: uuid.UUID,
    body: CodeWorkspaceStructureUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    return update_project_structure(db, user.id, project_id, body)


@router.post("/projects/{project_id}/nodes", response_model=CodeWorkspaceProjectResponse, status_code=status.HTTP_201_CREATED)
def code_workspace_add_node(
    project_id: uuid.UUID,
    body: CodeWorkspaceNodeCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    return add_project_node(db, user.id, project_id, body)


@router.patch("/projects/{project_id}/nodes/{node_id}", response_model=CodeWorkspaceProjectResponse)
def code_workspace_update_node(
    project_id: uuid.UUID,
    node_id: str,
    body: CodeWorkspaceNodeUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    return update_project_node(db, user.id, project_id, node_id, body)


@router.get("/projects/{project_id}/files/{node_id}", response_model=CodeWorkspaceFileContentResponse)
def code_workspace_get_file_content(
    project_id: uuid.UUID,
    node_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    row = get_project(db, user.id, project_id)
    state = parse_project_state(row.state)
    content = read_file_content(db, user.id, project_id, state.nodes, node_id)
    return CodeWorkspaceFileContentResponse(node_id=node_id, content=content)


@router.post("/projects/{project_id}/search", response_model=CodeWorkspaceSearchResponse)
def code_workspace_search_project(
    project_id: uuid.UUID,
    body: CodeWorkspaceSearchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    """Search files in a project by name, path, or content. Used by agents and the IDE."""
    _ensure_enabled()
    return search_project_files(db, user.id, project_id, body)


@router.post("/projects/{project_id}/agent/search/stream")
def code_workspace_search_agent_stream(
    project_id: uuid.UUID,
    body: CodeWorkspaceAgentSearchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
) -> StreamingResponse:
    """LangGraph search agent — streams tokens and file matches for the Clovops sidebar."""
    _ensure_enabled()
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message is required.")

    row = get_project(db, user.id, project_id)
    project_title = row.title

    async def events():
        async for event in stream_code_workspace_search_agent(
            user.id,
            project_id,
            body,
            project_title=project_title,
        ):
            yield event

    return sse_response(events())


@router.put("/projects/{project_id}/files/{node_id}", response_model=CodeWorkspaceFileContentResponse)
def code_workspace_save_file_content(
    project_id: uuid.UUID,
    node_id: str,
    body: CodeWorkspaceFileContentUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    row = get_project(db, user.id, project_id)
    state = parse_project_state(row.state)
    write_file_content(db, user.id, project_id, state.nodes, node_id, body.content)
    return CodeWorkspaceFileContentResponse(node_id=node_id, content=body.content)


@router.get("/settings", response_model=CodeWorkspaceSettingsResponse)
def code_workspace_get_settings(
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    return CodeWorkspaceSettingsResponse.model_validate(get_user_settings(db, user.id))


@router.put("/settings", response_model=CodeWorkspaceSettingsResponse)
def code_workspace_update_settings(
    body: CodeWorkspaceSettingsUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    payload = update_user_settings(db, user.id, body)
    return CodeWorkspaceSettingsResponse.model_validate(payload)


@router.post("/projects/{project_id}/deploy", response_model=CodeWorkspaceDeployResponse)
def code_workspace_deploy_project(
    project_id: uuid.UUID,
    body: CodeWorkspaceDeployRequest | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    payload = body or CodeWorkspaceDeployRequest()
    return deploy_project(db, user.id, project_id, payload)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def code_workspace_delete_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    delete_project(db, user.id, project_id)
