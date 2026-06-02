from __future__ import annotations

from pydantic import BaseModel, Field

from clovai_apps.photo_studio.presets import (
    CanvasBackgroundId,
    PhotoStudioAspectRatio,
    PhotoStudioCreationType,
    PhotoStudioStylePreset,
)


class PhotoStudioGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    creation_type: PhotoStudioCreationType = Field(default="product", alias="creationType")
    aspect_ratio: PhotoStudioAspectRatio = Field(default="1:1", alias="aspectRatio")
    style_preset: PhotoStudioStylePreset = Field(default="studio", alias="stylePreset")
    transparent_background: bool | None = Field(default=None, alias="transparentBackground")
    asset_id: str | None = Field(default=None, alias="assetId")

    model_config = {"populate_by_name": True}


class PhotoStudioGeneratedItem(BaseModel):
    id: str
    prompt: str
    creation_type: PhotoStudioCreationType = Field(serialization_alias="creationType")
    aspect_ratio: str = Field(serialization_alias="aspectRatio")
    style_preset: str = Field(serialization_alias="stylePreset")
    label: str
    preview_gradient: str = Field(serialization_alias="previewGradient")
    created_at: int = Field(serialization_alias="createdAt")
    transparent_background: bool | None = Field(
        default=None, serialization_alias="transparentBackground"
    )
    canvas_background_id: CanvasBackgroundId | None = Field(
        default=None, serialization_alias="canvasBackgroundId"
    )
    variant_index: int | None = Field(default=None, serialization_alias="variantIndex")
    image_url: str | None = Field(default=None, serialization_alias="imageUrl")
    batch_id: str | None = Field(default=None, serialization_alias="batchId")

    model_config = {"populate_by_name": True}


class PhotoStudioGenerateResponse(BaseModel):
    batch_id: str = Field(serialization_alias="batchId")
    variants: list[PhotoStudioGeneratedItem]

    model_config = {"populate_by_name": True}


class PhotoStudioOptionsResponse(BaseModel):
    creation_types: list[dict[str, str]] = Field(serialization_alias="creationTypes")
    aspect_ratios: list[dict[str, str]] = Field(serialization_alias="aspectRatios")
    style_presets: list[dict[str, str]] = Field(serialization_alias="stylePresets")
    batch_size: int = Field(serialization_alias="batchSize")

    model_config = {"populate_by_name": True}


class PhotoStudioAssetSummary(BaseModel):
    id: str
    name: str
    mime_type: str | None = Field(default=None, serialization_alias="mimeType")
    download_url: str = Field(serialization_alias="downloadUrl")
    created_at: str | None = Field(default=None, serialization_alias="createdAt")

    model_config = {"populate_by_name": True}


class PhotoStudioGenerationListResponse(BaseModel):
    data: list[PhotoStudioGeneratedItem]
