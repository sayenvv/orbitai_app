from __future__ import annotations

import time
import uuid

from clovai_apps.photo_studio.presets import (
    ASPECT_RATIOS,
    CREATION_TYPES,
    DEFAULT_CANVAS_BACKGROUND_IDS,
    GENERATION_BATCH_SIZE,
    GENERATION_PREVIEW_GRADIENTS,
    STYLE_PRESETS,
)
from clovai_apps.photo_studio.schemas import (
    PhotoStudioGenerateRequest,
    PhotoStudioGenerateResponse,
    PhotoStudioGeneratedItem,
    PhotoStudioOptionsResponse,
)


def get_photo_studio_options() -> PhotoStudioOptionsResponse:
    return PhotoStudioOptionsResponse(
        creation_types=[dict(item) for item in CREATION_TYPES],
        aspect_ratios=[dict(item) for item in ASPECT_RATIOS],
        style_presets=[dict(item) for item in STYLE_PRESETS],
        batch_size=GENERATION_BATCH_SIZE,
    )


def create_generation_batch(
    request: PhotoStudioGenerateRequest,
    *,
    batch_id: str | None = None,
    reference_image_url: str | None = None,
) -> PhotoStudioGenerateResponse:
    resolved_batch_id = batch_id or str(int(time.time() * 1000))
    created_at = int(time.time() * 1000)
    is_transparent_logo = (
        request.creation_type == "logo" and request.transparent_background is not False
    )

    variants: list[PhotoStudioGeneratedItem] = []
    for index in range(GENERATION_BATCH_SIZE):
        label = f"Logo {index + 1}" if is_transparent_logo else f"Variant {index + 1}"
        canvas_background_id = None
        if is_transparent_logo:
            canvas_background_id = DEFAULT_CANVAS_BACKGROUND_IDS[
                index % len(DEFAULT_CANVAS_BACKGROUND_IDS)
            ]

        variants.append(
            PhotoStudioGeneratedItem(
                id=f"{resolved_batch_id}-{index}",
                batch_id=resolved_batch_id,
                prompt=request.prompt.strip(),
                creation_type=request.creation_type,
                aspect_ratio=request.aspect_ratio,
                style_preset=request.style_preset,
                label=label,
                preview_gradient=GENERATION_PREVIEW_GRADIENTS[
                    index % len(GENERATION_PREVIEW_GRADIENTS)
                ],
                created_at=created_at,
                transparent_background=is_transparent_logo or None,
                canvas_background_id=canvas_background_id,
                variant_index=index,
                image_url=reference_image_url,
            )
        )

    return PhotoStudioGenerateResponse(batch_id=resolved_batch_id, variants=variants)


def generate_photo_studio_variants(
    request: PhotoStudioGenerateRequest,
    *,
    reference_image_url: str | None = None,
) -> PhotoStudioGenerateResponse:
    """Generate a batch of Photo Studio variants (provider stub — deterministic previews for now)."""
    return create_generation_batch(request, reference_image_url=reference_image_url)


def new_batch_id() -> str:
    return str(uuid.uuid4())
