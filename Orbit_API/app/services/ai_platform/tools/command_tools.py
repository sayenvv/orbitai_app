"""Sandboxed command execution."""

from __future__ import annotations

import asyncio
import shlex
from typing import Any

BLOCKED_FRAGMENTS = (
    "rm -rf /",
    "sudo ",
    "curl ",
    "| bash",
    "chmod 777",
    "ssh ",
    "> /dev/",
)


async def run_sandbox_command(
    workspace_path: str,
    command: str,
    *,
    timeout_seconds: int = 120,
) -> dict[str, Any]:
    normalized = command.strip()
    lowered = normalized.lower()
    for fragment in BLOCKED_FRAGMENTS:
        if fragment in lowered:
            raise ValueError(f"Blocked command fragment detected: {fragment}")

    proc = await asyncio.create_subprocess_shell(
        normalized,
        cwd=workspace_path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout_seconds)
    except TimeoutError:
        proc.kill()
        return {
            "command": normalized,
            "exit_code": 124,
            "stdout": "",
            "stderr": f"Command timed out after {timeout_seconds}s",
        }

    return {
        "command": normalized,
        "exit_code": int(proc.returncode or 0),
        "stdout": stdout.decode("utf-8", errors="ignore"),
        "stderr": stderr.decode("utf-8", errors="ignore"),
    }


def shell_join(parts: list[str]) -> str:
    return " ".join(shlex.quote(part) for part in parts)
