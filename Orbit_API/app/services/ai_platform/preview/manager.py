"""Run dev/preview servers for generated workspaces with streamed terminal output."""

from __future__ import annotations

import asyncio
import socket
import time
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from uuid import UUID

from app.services.ai_platform.tools.workspace_paths import SKIP_DIR_NAMES, iter_workspace_paths


async def wait_for_port(host: str, port: int, *, timeout: float = 120.0) -> bool:
    """Poll until a TCP port accepts connections or timeout expires."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port),
                timeout=1.0,
            )
            writer.close()
            await writer.wait_closed()
            return True
        except (TimeoutError, OSError, ConnectionRefusedError):
            await asyncio.sleep(0.35)
    return False


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def detect_preview_stack(workspace_path: Path) -> dict[str, Any]:
    if (workspace_path / "package.json").exists():
        return {
            "stack": "node",
            "command": "npm run dev",
            "install_command": "npm install --no-audit --no-fund",
            "needs_install": not (workspace_path / "node_modules").exists(),
        }
    return {
        "stack": "static",
        "command": None,
        "install_command": None,
        "needs_install": False,
    }


def _build_static_command(port: int) -> str:
    return f"python3 -m http.server {port} --bind 127.0.0.1"


def _build_node_command(port: int) -> str:
    return f"npm run dev -- --port {port} --hostname 127.0.0.1"


@dataclass
class PreviewSession:
    run_id: str
    workspace_path: str
    stack: str
    port: int
    preview_url: str
    command: str
    process: asyncio.subprocess.Process | None = None
    log_buffer: deque[str] = field(default_factory=lambda: deque(maxlen=2000))
    status: str = "starting"
    ready: bool = False
    exit_code: int | None = None

    def append_log(self, line: str, *, stream: str = "stdout") -> None:
        prefix = "[stderr] " if stream == "stderr" else ""
        self.log_buffer.append(f"{prefix}{line.rstrip()}")


class PreviewManager:
    def __init__(self) -> None:
        self._sessions: dict[str, PreviewSession] = {}
        self._tasks: dict[str, asyncio.Task] = {}
        self._host = "127.0.0.1"

    def get(self, run_id: str) -> PreviewSession | None:
        return self._sessions.get(run_id)

    async def stop(self, run_id: str) -> None:
        session = self._sessions.get(run_id)
        if session is None:
            return
        task = self._tasks.pop(run_id, None)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        if session.process and session.process.returncode is None:
            session.process.terminate()
            try:
                await asyncio.wait_for(session.process.wait(), timeout=5)
            except TimeoutError:
                session.process.kill()
        session.status = "stopped"
        self._sessions.pop(run_id, None)

    async def start(self, run_id: UUID, workspace_path: str) -> PreviewSession:
        key = str(run_id)
        await self.stop(key)

        root = Path(workspace_path)
        if not root.is_dir():
            raise ValueError("Workspace path not found.")

        meta = detect_preview_stack(root)
        stack = str(meta["stack"])

        if stack == "static":
            proxy_url = f"/api/platform/runs/{key}/preview/proxy"
            session = PreviewSession(
                run_id=key,
                workspace_path=str(root),
                stack=stack,
                port=0,
                preview_url=proxy_url,
                command="workspace files",
            )
            session.status = "running"
            session.ready = True
            session.append_log("Serving static files directly from workspace.")
            session.append_log(f"Preview ready at {proxy_url}")
            self._sessions[key] = session
            return session

        port = _find_free_port()
        command = _build_node_command(port)

        session = PreviewSession(
            run_id=key,
            workspace_path=str(root),
            stack=stack,
            port=port,
            preview_url=f"http://{self._host}:{port}",
            command=command,
        )
        self._sessions[key] = session
        self._tasks[key] = asyncio.create_task(self._run_session(session, meta))
        return session

    async def _run_session(self, session: PreviewSession, meta: dict[str, Any]) -> None:
        root = Path(session.workspace_path)
        try:
            if meta.get("needs_install") and meta.get("install_command"):
                session.append_log(f"$ {meta['install_command']}")
                install = await asyncio.create_subprocess_shell(
                    str(meta["install_command"]),
                    cwd=str(root),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                )
                assert install.stdout is not None
                while True:
                    line = await install.stdout.readline()
                    if not line:
                        break
                    session.append_log(line.decode("utf-8", errors="ignore"))
                await install.wait()
                session.append_log(f"install exit code: {install.returncode}")
                if install.returncode not in (0, None):
                    session.status = "failed"
                    session.exit_code = int(install.returncode or 1)
                    return

            session.append_log(f"$ {session.command}")
            proc = await asyncio.create_subprocess_shell(
                session.command,
                cwd=str(root),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            session.process = proc

            if not await wait_for_port(self._host, session.port, timeout=120.0):
                session.status = "failed"
                session.exit_code = 1
                session.append_log("Preview server did not become ready in time.")
                proc.terminate()
                return

            session.status = "running"
            session.ready = True
            session.append_log(f"Preview ready at {session.preview_url}")

            async def pump(stream: asyncio.StreamReader | None, name: str) -> None:
                if stream is None:
                    return
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    session.append_log(line.decode("utf-8", errors="ignore"), stream=name)

            await asyncio.gather(
                pump(proc.stdout, "stdout"),
                pump(proc.stderr, "stderr"),
            )
            session.exit_code = int(proc.returncode or 0)
            session.status = "stopped" if session.exit_code == 0 else "failed"
            session.append_log(f"process exited with code {session.exit_code}")
        except asyncio.CancelledError:
            session.status = "stopped"
            session.append_log("Preview stopped.")
            raise
        except Exception as exc:
            session.status = "failed"
            session.append_log(f"Preview error: {exc}")

    async def stream_events(self, run_id: str) -> Any:
        key = str(run_id)
        session = self._sessions.get(key)
        if session is None:
            yield {"type": "error", "message": "No active preview session. Start preview first."}
            return

        cursor = 0
        ready_sent = False
        yield {
            "type": "preview_started",
            "preview_url": session.preview_url,
            "preview_proxy_url": f"/api/platform/runs/{key}/preview/proxy",
            "port": session.port,
            "stack": session.stack,
            "command": session.command,
            "status": session.status,
        }

        while True:
            buffer = list(session.log_buffer)
            while cursor < len(buffer):
                yield {"type": "log", "message": buffer[cursor]}
                cursor += 1

            if session.ready and not ready_sent:
                ready_sent = True
                yield {
                    "type": "preview_ready",
                    "preview_url": session.preview_url,
                    "preview_proxy_url": f"/api/platform/runs/{key}/preview/proxy",
                    "port": session.port,
                    "stack": session.stack,
                    "command": session.command,
                    "status": session.status,
                }

            if session.status in {"failed", "stopped"}:
                yield {
                    "type": "preview_ended",
                    "status": session.status,
                    "exit_code": session.exit_code,
                    "preview_url": session.preview_url,
                }
                return

            await asyncio.sleep(0.4)

    def serialize(self, session: PreviewSession | None) -> dict[str, Any]:
        if session is None:
            return {"active": False}
        return {
            "active": session.status in {"starting", "running"},
            "ready": session.ready,
            "status": session.status,
            "preview_url": session.preview_url,
            "port": session.port,
            "stack": session.stack,
            "command": session.command,
            "exit_code": session.exit_code,
            "log_tail": list(session.log_buffer)[-40:],
        }
