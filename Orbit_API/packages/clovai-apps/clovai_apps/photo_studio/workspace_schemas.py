from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PhotoStudioWorkspaceState(BaseModel):
    """Full editable workspace document stored as JSON."""

    title: str = "Untitled project"
    asset_id: str | None = Field(default=None, alias="assetId")
    asset_name: str | None = Field(default=None, alias="assetName")
    aspect_ratio: str = Field(default="1:1", alias="aspectRatio")
    creation_type: str = Field(default="logo", alias="creationType")
    style_preset: str = Field(default="studio", alias="stylePreset")
    logo_transparent_background: bool = Field(default=True, alias="logoTransparentBackground")
    canvas_background_id: str = Field(default="violet-sunset", alias="canvasBackgroundId")
    custom_canvas_background_color: str = Field(default="#6366f1", alias="customCanvasBackgroundColor")
    custom_canvas_gradient_end: str = Field(default="#a855f7", alias="customCanvasGradientEnd")
    custom_canvas_gradient_enabled: bool = Field(default=False, alias="customCanvasGradientEnabled")
    project_name: str = Field(default="", alias="projectName")
    canvas_shapes: list[dict[str, Any]] = Field(default_factory=list, alias="canvasShapes")
    canvas_texts: list[dict[str, Any]] = Field(default_factory=list, alias="canvasTexts")
    generated_items: list[dict[str, Any]] = Field(default_factory=list, alias="generatedItems")
    saved_designs: list[dict[str, Any]] = Field(default_factory=list, alias="savedDesigns")
    selected_generation_id: str | None = Field(default=None, alias="selectedGenerationId")
    materialized_generation_id: str | None = Field(default=None, alias="materializedGenerationId")

    model_config = {"populate_by_name": True}


class PhotoStudioWorkspaceSummary(BaseModel):
    id: str
    title: str
    asset_id: str | None = Field(default=None, serialization_alias="assetId")
    asset_name: str | None = Field(default=None, serialization_alias="assetName")
    aspect_ratio: str = Field(serialization_alias="aspectRatio")
    opened_at: int = Field(serialization_alias="openedAt")
    updated_at: int = Field(serialization_alias="updatedAt")

    model_config = {"populate_by_name": True}


class PhotoStudioWorkspaceResponse(BaseModel):
    id: str
    title: str
    asset_id: str | None = Field(default=None, serialization_alias="assetId")
    asset_name: str | None = Field(default=None, serialization_alias="assetName")
    opened_at: int = Field(serialization_alias="openedAt")
    updated_at: int = Field(serialization_alias="updatedAt")
    state: PhotoStudioWorkspaceState

    model_config = {"populate_by_name": True}


class PhotoStudioWorkspaceListResponse(BaseModel):
    data: list[PhotoStudioWorkspaceSummary]


class PhotoStudioWorkspaceCreateRequest(BaseModel):
    title: str | None = None
    asset_id: str | None = Field(default=None, alias="assetId")
    asset_name: str | None = Field(default=None, alias="assetName")
    state: PhotoStudioWorkspaceState | None = None

    model_config = {"populate_by_name": True}


class PhotoStudioWorkspaceUpdateRequest(BaseModel):
    title: str | None = None
    asset_id: str | None = Field(default=None, alias="assetId")
    asset_name: str | None = Field(default=None, alias="assetName")
    state: PhotoStudioWorkspaceState | None = None
    touch: bool = True

    model_config = {"populate_by_name": True}
