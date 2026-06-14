"""Basic secret scanning before artifact upload."""

from __future__ import annotations

from pathlib import Path

from app.services.ai_platform.tools.workspace_paths import iter_workspace_paths

SUSPICIOUS_PATTERNS = (
    "AKIA",
    "SECRET_KEY",
    "API_KEY=",
    "password=",
    "BEGIN PRIVATE KEY",
    "sk-",
)


def scan_workspace_secrets(workspace_path: str) -> dict:
    root = Path(workspace_path)
    findings: list[dict] = []
    for path in iter_workspace_paths(root, files_only=True):
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for pattern in SUSPICIOUS_PATTERNS:
            if pattern in text:
                findings.append({"path": str(path.relative_to(root)), "pattern": pattern})
                break
    return {"passed": len(findings) == 0, "findings": findings}
