"""AI coding platform — project generation and artifact download."""

from __future__ import annotations

import uuid
from pathlib import Path

import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.api.v1.public.auth import require_chat_user
from app.core.config import settings
from app.db.session import get_db
from app.models import User
from app.models.ai_platform import PlatformArtifact, PlatformExecutionLog, PlatformWorkflowRun
from app.schemas.ai_platform import (
    PlatformExecutionLogResponse,
    PlatformGenerateRequest,
    PlatformOpenIdeResponse,
    PlatformPreviewStatusResponse,
    PlatformWorkflowRunResponse,
)
from app.services.ai_platform.preview import preview_manager
from app.services.ai_platform.preview.proxy_utils import rewrite_preview_body
from app.services.ai_platform.preview.static_serve import (
    guess_preview_media_type,
    is_static_workspace,
    resolve_workspace_preview_file,
)
from app.services.ai_platform.stream import platform_sse_response
from app.services.ai_platform.workspace.ide_bridge import build_open_targets, import_run_to_code_workspace
from app.services.code_workspace.sse import code_workspace_sse_response

router = APIRouter(prefix="/platform", tags=["ai-platform"])

_PREVIEW_PROXY_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
_HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


def _ensure_enabled() -> None:
    if not settings.ai_platform_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI platform is disabled.",
        )


def _get_user_run(
    db: Session,
    *,
    user_id: uuid.UUID,
    run_id: uuid.UUID,
) -> PlatformWorkflowRun:
    row = (
        db.query(PlatformWorkflowRun)
        .filter(PlatformWorkflowRun.id == run_id, PlatformWorkflowRun.user_id == user_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Workflow run not found.")
    return row


def _preview_proxy_url(run_id: uuid.UUID) -> str:
    return f"/api/platform/runs/{run_id}/preview/proxy"


def _serialize_preview(run_id: uuid.UUID, *, workspace_path: str | None = None) -> PlatformPreviewStatusResponse:
    session = preview_manager.get(str(run_id))
    payload = preview_manager.serialize(session)
    proxy_url: str | None = None
    if payload.get("ready"):
        proxy_url = _preview_proxy_url(run_id)
    elif workspace_path and is_static_workspace(workspace_path):
        proxy_url = _preview_proxy_url(run_id)
    return PlatformPreviewStatusResponse(
        active=bool(payload.get("active")),
        status=payload.get("status"),
        preview_url=payload.get("preview_url"),
        preview_proxy_url=proxy_url,
        port=payload.get("port"),
        stack=payload.get("stack"),
        command=payload.get("command"),
        exit_code=payload.get("exit_code"),
        log_tail=list(payload.get("log_tail") or []),
    )


@router.post("/generate/stream")
async def platform_generate_stream(
    body: PlatformGenerateRequest,
    user: User = Depends(require_chat_user),
):
    """Generate a full project from a natural-language prompt with SSE progress events."""
    _ensure_enabled()
    prompt = body.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Prompt is required.")
    return platform_sse_response(user, prompt=prompt, conversation_id=body.conversation_id)


@router.get("/runs/{run_id}", response_model=PlatformWorkflowRunResponse)
def platform_get_run(
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    row = (
        db.query(PlatformWorkflowRun)
        .filter(PlatformWorkflowRun.id == run_id, PlatformWorkflowRun.user_id == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Workflow run not found.")
    return row


@router.get("/runs/{run_id}/logs", response_model=list[PlatformExecutionLogResponse])
def platform_get_run_logs(
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    row = (
        db.query(PlatformWorkflowRun)
        .filter(PlatformWorkflowRun.id == run_id, PlatformWorkflowRun.user_id == user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Workflow run not found.")
    logs = (
        db.query(PlatformExecutionLog)
        .filter(PlatformExecutionLog.workflow_run_id == run_id)
        .order_by(PlatformExecutionLog.created_at.asc())
        .all()
    )
    return logs


@router.get("/artifacts/download/{file_name}")
def platform_download_artifact(
    file_name: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    """Download locally stored ZIP artifacts (when Azure Blob is not configured)."""
    _ensure_enabled()
    safe_name = Path(file_name).name
    artifact = (
        db.query(PlatformArtifact)
        .join(PlatformWorkflowRun, PlatformArtifact.workflow_run_id == PlatformWorkflowRun.id)
        .filter(
            PlatformArtifact.file_name == safe_name,
            PlatformWorkflowRun.user_id == user.id,
        )
        .order_by(PlatformArtifact.created_at.desc())
        .first()
    )
    if artifact is None:
        raise HTTPException(status_code=404, detail="Artifact not found.")

    local_path = Path(settings.ai_platform_artifact_dir) / safe_name
    if not local_path.exists():
        raise HTTPException(status_code=404, detail="Artifact file missing on disk.")
    return FileResponse(
        path=str(local_path),
        media_type="application/zip",
        filename=safe_name,
    )


@router.post("/runs/{run_id}/preview/start", response_model=PlatformPreviewStatusResponse)
async def platform_preview_start(
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    """Start a local dev/preview server for a completed workflow workspace."""
    _ensure_enabled()
    row = _get_user_run(db, user_id=user.id, run_id=run_id)
    if not row.workspace_path:
        raise HTTPException(status_code=400, detail="Workspace path is missing for this run.")
    try:
        await preview_manager.start(run_id, str(row.workspace_path))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _serialize_preview(run_id, workspace_path=str(row.workspace_path or ""))


@router.post("/runs/{run_id}/preview/stop", response_model=PlatformPreviewStatusResponse)
async def platform_preview_stop(
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    row = _get_user_run(db, user_id=user.id, run_id=run_id)
    await preview_manager.stop(str(run_id))
    return _serialize_preview(run_id, workspace_path=str(row.workspace_path or ""))


@router.get("/runs/{run_id}/preview/status", response_model=PlatformPreviewStatusResponse)
def platform_preview_status(
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    _ensure_enabled()
    row = _get_user_run(db, user_id=user.id, run_id=run_id)
    return _serialize_preview(run_id, workspace_path=str(row.workspace_path or ""))


@router.get("/runs/{run_id}/preview/stream")
async def platform_preview_stream(
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    """SSE stream of preview terminal output."""
    _ensure_enabled()
    _get_user_run(db, user_id=user.id, run_id=run_id)
    return code_workspace_sse_response(preview_manager.stream_events(str(run_id)))


@router.api_route(
    "/runs/{run_id}/preview/proxy",
    methods=_PREVIEW_PROXY_METHODS,
    include_in_schema=False,
)
@router.api_route(
    "/runs/{run_id}/preview/proxy/{path:path}",
    methods=_PREVIEW_PROXY_METHODS,
    include_in_schema=False,
)
async def platform_preview_proxy(
    run_id: uuid.UUID,
    request: Request,
    path: str = "",
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    """Serve preview files — static workspaces from disk, Node projects via dev-server proxy."""
    _ensure_enabled()
    row = _get_user_run(db, user_id=user.id, run_id=run_id)
    session = preview_manager.get(str(run_id))
    workspace_path = str(row.workspace_path or (session.workspace_path if session else "") or "")

    if is_static_workspace(workspace_path):
        try:
            file_path = resolve_workspace_preview_file(workspace_path, path)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=404, detail="Preview file not found.") from exc

        raw = file_path.read_bytes()
        media_type = guess_preview_media_type(file_path)
        content = rewrite_preview_body(
            run_id=str(run_id),
            content=raw,
            content_type=media_type,
        )
        return Response(
            content=content,
            media_type=media_type,
            headers={"Cache-Control": "no-cache"},
        )

    if session is None or session.status not in {"starting", "running"}:
        raise HTTPException(status_code=404, detail="Preview is not running.")
    if not session.ready:
        raise HTTPException(status_code=503, detail="Preview server is still starting.")

    upstream_path = path or ""
    if upstream_path and not upstream_path.startswith("/"):
        upstream_path = f"/{upstream_path}"
    target_url = f"http://127.0.0.1:{session.port}{upstream_path or '/'}"
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    forward_headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length", "connection", "accept-encoding"}
    }
    forward_headers["Host"] = f"127.0.0.1:{session.port}"

    body = await request.body()
    upstream = None
    last_error: Exception | None = None
    for _ in range(5):
        try:
            async with httpx.AsyncClient(follow_redirects=False, timeout=60.0) as client:
                upstream = await client.request(
                    request.method,
                    target_url,
                    headers=forward_headers,
                    content=body if body else None,
                )
            break
        except httpx.HTTPError as exc:
            last_error = exc
            await asyncio.sleep(0.35)

    if upstream is None:
        detail = f"Preview upstream unavailable: {last_error}" if last_error else "Preview upstream unavailable."
        raise HTTPException(status_code=502, detail=detail)

    content_type = upstream.headers.get("content-type")
    content = rewrite_preview_body(
        run_id=str(run_id),
        content=upstream.content,
        content_type=content_type,
    )

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in _HOP_BY_HOP_HEADERS | {"content-length", "content-encoding"}
    }

    location_key = next((key for key in response_headers if key.lower() == "location"), None)
    if location_key:
        location = response_headers[location_key]
        upstream_origin = f"http://127.0.0.1:{session.port}"
        proxy_base = _preview_proxy_url(run_id).rstrip("/")
        if location.startswith(upstream_origin):
            suffix = location[len(upstream_origin) :] or "/"
            response_headers[location_key] = f"{proxy_base}{suffix}"
        elif location.startswith("/"):
            response_headers[location_key] = f"{proxy_base}{location}"

    return Response(
        content=content,
        status_code=upstream.status_code,
        headers=response_headers,
        media_type=content_type,
    )


@router.post("/runs/{run_id}/open-ide", response_model=PlatformOpenIdeResponse)
def platform_open_ide(
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_chat_user),
):
    """Import the generated workspace into Orbit Code IDE and return open targets."""
    _ensure_enabled()
    row = _get_user_run(db, user_id=user.id, run_id=run_id)
    try:
        project = import_run_to_code_workspace(db, user_id=user.id, run=row)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    targets = build_open_targets(row, project_id=project.id)
    return PlatformOpenIdeResponse(
        project_id=project.id,
        orbit_ide_url=targets["orbit_ide_url"],
        vscode_url=targets["vscode_url"],
        workspace_path=targets["workspace_path"],
        title=project.title,
    )
