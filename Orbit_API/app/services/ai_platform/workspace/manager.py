"""Workspace lifecycle for generated projects."""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from app.core.config import settings
from app.services.ai_platform.seeds.defaults import PROJECT_TEMPLATES
from app.services.ai_platform.tools.file_tools import write_workspace_files


class WorkspaceManager:
    def __init__(self, base_dir: str | None = None) -> None:
        root = base_dir or settings.ai_platform_workspace_dir
        self.base_dir = Path(root)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def create(self, user_id: uuid.UUID, run_id: uuid.UUID) -> str:
        path = self.base_dir / str(user_id) / str(run_id)
        path.mkdir(parents=True, exist_ok=True)
        return str(path)

    def seed_template(self, workspace_path: str, template_key: str) -> list[str]:
        template = PROJECT_TEMPLATES.get(template_key) or PROJECT_TEMPLATES["nextjs_basic"]
        files = [{"path": path, "content": content} for path, content in template["files"].items()]
        return write_workspace_files(workspace_path, files)

    def destroy(self, workspace_path: str) -> None:
        path = Path(workspace_path)
        if path.exists() and path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
