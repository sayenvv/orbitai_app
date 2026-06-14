"""Azure Blob Storage upload with local fallback."""

from __future__ import annotations

import shutil
from pathlib import Path

from app.core.config import settings


class BlobStorageService:
    def upload_file(
        self,
        local_path: str,
        *,
        blob_name: str | None = None,
        content_type: str = "application/zip",
    ) -> dict:
        source = Path(local_path)
        if not source.exists():
            raise FileNotFoundError(local_path)

        name = blob_name or source.name
        size = source.stat().st_size

        if settings.azure_storage_connection_string.strip() and settings.azure_storage_container.strip():
            return self._upload_azure(source, blob_name=name, content_type=content_type, size=size)

        return self._upload_local(source, blob_name=name, size=size)

    def _upload_local(self, source: Path, *, blob_name: str, size: int) -> dict:
        dest_dir = Path(settings.ai_platform_artifact_dir)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / blob_name
        shutil.copy2(source, dest)
        url = f"/api/platform/artifacts/download/{dest.name}"
        return {"blob_url": url, "size_bytes": size, "storage": "local"}

    def _upload_azure(self, source: Path, *, blob_name: str, content_type: str, size: int) -> dict:
        from azure.storage.blob import BlobServiceClient

        client = BlobServiceClient.from_connection_string(
            settings.azure_storage_connection_string.strip()
        )
        container = client.get_container_client(settings.azure_storage_container.strip())
        blob = container.get_blob_client(blob_name)
        with source.open("rb") as handle:
            blob.upload_blob(handle, overwrite=True, content_type=content_type)

        url = blob.url
        if settings.azure_storage_public_base_url.strip():
            url = f"{settings.azure_storage_public_base_url.rstrip('/')}/{blob_name}"

        return {"blob_url": url, "size_bytes": size, "storage": "azure"}
