from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PhotoStudioCanvasExportRequest(BaseModel):
    """Canvas layers snapshot written to a JSON file on the server."""

    workspace_id: str | None = Field(default=None, alias="workspaceId")
    draft_id: str | None = Field(default=None, alias="draftId")
    project_name: str = Field(default="", alias="projectName")
    aspect_ratio: str = Field(default="1:1", alias="aspectRatio")
    canvas_background_id: str = Field(default="violet-sunset", alias="canvasBackgroundId")
    custom_canvas_background_color: str = Field(
        default="#6366f1",
        alias="customCanvasBackgroundColor",
    )
    custom_canvas_gradient_end: str = Field(default="#a855f7", alias="customCanvasGradientEnd")
    custom_canvas_gradient_enabled: bool = Field(
        default=False,
        alias="customCanvasGradientEnabled",
    )
    canvas_shapes: list[dict[str, Any]] = Field(default_factory=list, alias="canvasShapes")
    canvas_texts: list[dict[str, Any]] = Field(default_factory=list, alias="canvasTexts")

    model_config = {"populate_by_name": True}


class PhotoStudioCanvasExportPayload(BaseModel):
    """On-disk / API body for round-trip canvas restore."""

    exported_at: str | None = Field(default=None, alias="exportedAt")
    workspace_id: str | None = Field(default=None, alias="workspaceId")
    draft_id: str | None = Field(default=None, alias="draftId")
    project_name: str = Field(default="", alias="projectName")
    aspect_ratio: str = Field(default="1:1", alias="aspectRatio")
    canvas_background_id: str = Field(default="violet-sunset", alias="canvasBackgroundId")
    custom_canvas_background_color: str = Field(
        default="#6366f1",
        alias="customCanvasBackgroundColor",
    )
    custom_canvas_gradient_end: str = Field(default="#a855f7", alias="customCanvasGradientEnd")
    custom_canvas_gradient_enabled: bool = Field(
        default=False,
        alias="customCanvasGradientEnabled",
    )
    canvas_shapes: list[dict[str, Any]] = Field(default_factory=list, alias="canvasShapes")
    canvas_texts: list[dict[str, Any]] = Field(default_factory=list, alias="canvasTexts")

    model_config = {"populate_by_name": True}


class PhotoStudioCanvasExportResponse(BaseModel):
    file_name: str = Field(alias="fileName", serialization_alias="fileName")
    relative_path: str = Field(alias="relativePath", serialization_alias="relativePath")

    model_config = {"populate_by_name": True}
