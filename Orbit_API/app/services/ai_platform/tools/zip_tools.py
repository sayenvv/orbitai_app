"""ZIP artifact creation."""

from __future__ import annotations

import shutil
import zipfile
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.services.ai_platform.tools.workspace_paths import SKIP_DIR_NAMES, iter_workspace_paths


DEFAULT_EXCLUDES = set(SKIP_DIR_NAMES) | {".env"}


def strip_heavy_workspace_dirs(workspace_path: str) -> list[str]:
    """Remove npm/build output before zipping — source files only in the artifact."""
    root = Path(workspace_path)
    removed: list[str] = []
    for name in ("node_modules", ".next", "dist", "build", ".turbo", "coverage"):
        target = root / name
        if target.exists():
            shutil.rmtree(target, ignore_errors=True)
            removed.append(name)
    return removed


def create_workspace_zip(
    workspace_path: str,
    output_path: str,
    *,
    artifact_name: str | None = None,
    exclude_paths: list[str] | None = None,
    max_total_bytes: int | None = None,
) -> dict[str, Any]:
    root = Path(workspace_path)
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    if out.exists():
        out.unlink()

    strip_heavy_workspace_dirs(workspace_path)

    excludes = set(DEFAULT_EXCLUDES)
    if exclude_paths:
        excludes.update(exclude_paths)

    byte_limit = max_total_bytes or settings.ai_platform_max_zip_bytes

    total = 0
    file_count = 0
    with zipfile.ZipFile(
        out,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        allowZip64=True,
    ) as archive:
        for path in iter_workspace_paths(root, files_only=True):
            rel = path.relative_to(root)
            if any(part in excludes for part in rel.parts):
                continue
            size = path.stat().st_size
            if size > byte_limit:
                raise ValueError(f"Single file too large for artifact: {rel} ({size} bytes)")
            total += size
            if total > byte_limit:
                raise ValueError(
                    f"ZIP size limit exceeded ({total} bytes). "
                    "Heavy folders like node_modules should be excluded."
                )
            archive.write(path, arcname=str(rel))
            file_count += 1

    return {
        "artifact_name": artifact_name or out.name,
        "path": str(out),
        "size_bytes": out.stat().st_size,
        "file_count": file_count,
    }
