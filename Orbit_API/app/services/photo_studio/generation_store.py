from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models import PhotoStudioGeneration
from clovai_apps.photo_studio.schemas import PhotoStudioGeneratedItem, PhotoStudioGenerateRequest
from clovai_apps.photo_studio.service import create_generation_batch, new_batch_id


def serialize_generation(row: PhotoStudioGeneration) -> PhotoStudioGeneratedItem:
    created_at_ms = int(row.created_at.timestamp() * 1000) if row.created_at else 0
    return PhotoStudioGeneratedItem(
        id=str(row.id),
        batch_id=row.batch_id,
        prompt=row.prompt,
        creation_type=row.creation_type,  # type: ignore[arg-type]
        aspect_ratio=row.aspect_ratio,
        style_preset=row.style_preset,
        label=row.label,
        preview_gradient=row.preview_gradient,
        created_at=created_at_ms,
        transparent_background=row.transparent_background,
        canvas_background_id=row.canvas_background_id,  # type: ignore[arg-type]
        variant_index=row.variant_index,
        image_url=row.image_url,
    )


def persist_generation_batch(
    db: Session,
    user_id: uuid.UUID,
    request: PhotoStudioGenerateRequest,
    *,
    reference_asset_id: uuid.UUID | None = None,
    reference_image_url: str | None = None,
) -> list[PhotoStudioGeneratedItem]:
    batch_id = new_batch_id()
    draft = create_generation_batch(
        request,
        batch_id=batch_id,
        reference_image_url=reference_image_url,
    )

    saved: list[PhotoStudioGeneration] = []
    for variant in draft.variants:
        row = PhotoStudioGeneration(
            id=uuid.uuid4(),
            user_id=user_id,
            batch_id=batch_id,
            prompt=variant.prompt,
            creation_type=variant.creation_type,
            aspect_ratio=variant.aspect_ratio,
            style_preset=variant.style_preset,
            label=variant.label,
            preview_gradient=variant.preview_gradient,
            transparent_background=variant.transparent_background,
            canvas_background_id=variant.canvas_background_id,
            variant_index=variant.variant_index or 0,
            reference_asset_id=reference_asset_id,
            image_url=variant.image_url,
        )
        db.add(row)
        saved.append(row)

    db.commit()
    for row in saved:
        db.refresh(row)
    return [serialize_generation(row) for row in saved]


def list_user_generations(db: Session, user_id: uuid.UUID, *, limit: int = 100) -> list[PhotoStudioGeneratedItem]:
    rows = (
        db.query(PhotoStudioGeneration)
        .filter(PhotoStudioGeneration.user_id == user_id)
        .order_by(PhotoStudioGeneration.created_at.desc())
        .limit(limit)
        .all()
    )
    return [serialize_generation(row) for row in rows]


def get_user_generation(
    db: Session,
    user_id: uuid.UUID,
    generation_id: uuid.UUID,
) -> PhotoStudioGeneration | None:
    return (
        db.query(PhotoStudioGeneration)
        .filter(
            PhotoStudioGeneration.id == generation_id,
            PhotoStudioGeneration.user_id == user_id,
        )
        .first()
    )


def delete_user_generation(db: Session, row: PhotoStudioGeneration) -> None:
    db.delete(row)
    db.commit()
