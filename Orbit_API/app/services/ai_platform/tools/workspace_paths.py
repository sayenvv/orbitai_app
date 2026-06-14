"""Workspace path iteration — never descend into heavy vendor directories."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

SKIP_DIR_NAMES = frozenset(
    {
        ".git",
        "node_modules",
        "__pycache__",
        ".next",
        "dist",
        "build",
        ".venv",
        "venv",
        "artifacts",
        ".checkpoints",
    }
)


def iter_workspace_paths(
    root: Path,
    *,
    files_only: bool = False,
    dirs_only: bool = False,
) -> Iterator[Path]:
    """Walk workspace without entering excluded directories."""
    if not root.exists():
        return

    stack = [root]
    while stack:
        current = stack.pop()
        try:
            children = sorted(current.iterdir(), key=lambda path: path.name)
        except OSError:
            continue
        for path in children:
            if path.name in SKIP_DIR_NAMES:
                continue
            if path.is_dir():
                if not files_only:
                    yield path
                stack.append(path)
            elif not dirs_only:
                yield path
