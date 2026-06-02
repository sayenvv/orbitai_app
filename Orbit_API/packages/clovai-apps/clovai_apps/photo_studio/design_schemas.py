from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class PhotoStudioDesignItem(BaseModel):
    id: str
    title: str
    aspect_ratio: str = Field(default="1:1", alias="aspectRatio", serialization_alias="aspectRatio")
    canvas_background_id: str = Field(
        default="violet-sunset",
        alias="canvasBackgroundId",
        serialization_alias="canvasBackgroundId",
    )
    shapes: list[dict[str, Any]]
    texts: list[dict[str, Any]]
    created_at: int = Field(default=0, alias="createdAt", serialization_alias="createdAt")
    source: Literal["system", "user"] = "user"

    model_config = {"populate_by_name": True}


class PhotoStudioDesignListResponse(BaseModel):
    templates: list[PhotoStudioDesignItem]
    saved: list[PhotoStudioDesignItem]

    model_config = {"populate_by_name": True}
