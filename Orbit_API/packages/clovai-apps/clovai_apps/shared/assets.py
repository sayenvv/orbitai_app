from __future__ import annotations

from typing import Any

IMAGE_MIME_TYPES = frozenset({"image/jpeg", "image/png"})
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png")
PHOTO_STUDIO_REFERENCE_METADATA_KEY = "photo_studio_reference"
ASSET_KIND_METADATA_KEY = "asset_kind"


def is_image_upload(*, content_type: str | None, filename: str | None) -> bool:
    normalized_type = (content_type or "").lower()
    normalized_name = (filename or "").lower()
    if normalized_type in IMAGE_MIME_TYPES:
        return True
    return any(normalized_name.endswith(ext) for ext in IMAGE_EXTENSIONS)


def detect_upload_kind(*, content_type: str | None, filename: str | None) -> str:
    """Return ``image`` or ``pdf``. Raises ValueError for unsupported image types."""
    normalized_type = (content_type or "").lower()
    if is_image_upload(content_type=content_type, filename=filename):
        return "image"
    if normalized_type.startswith("image/"):
        raise ValueError("Only JPG, JPEG, and PNG images are supported.")
    return "pdf"


def default_image_filename() -> str:
    return "reference.png"


def build_image_document_metadata(*, photo_studio_reference: bool = True) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        ASSET_KIND_METADATA_KEY: "image",
    }
    if photo_studio_reference:
        metadata[PHOTO_STUDIO_REFERENCE_METADATA_KEY] = True
    return metadata
