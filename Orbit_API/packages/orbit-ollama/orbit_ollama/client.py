from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import datetime
from typing import Any

import httpx

from orbit_ollama.config import OllamaSettings
from orbit_ollama.models import OllamaModel


class OllamaError(Exception):
    """Raised when the Ollama API returns an error."""


class OllamaClient:
    """Async HTTP client for the Ollama REST API."""

    def __init__(
        self,
        settings: OllamaSettings | None = None,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.settings = settings or OllamaSettings()
        self._base = self.settings.base_url_normalized
        self._transport = transport

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self._base,
            timeout=httpx.Timeout(self.settings.timeout),
            transport=self._transport,
        )

    async def is_available(self) -> bool:
        try:
            async with self._client() as client:
                response = await client.get("/api/tags")
                return response.status_code == 200
        except httpx.HTTPError:
            return False

    async def list_models(self) -> list[OllamaModel]:
        async with self._client() as client:
            response = await client.get("/api/tags")
            response.raise_for_status()
            payload = response.json()

        models: list[OllamaModel] = []
        for item in payload.get("models", []):
            details = item.get("details") or {}
            modified_raw = item.get("modified_at")
            modified_at = None
            if modified_raw:
                try:
                    modified_at = datetime.fromisoformat(modified_raw.replace("Z", "+00:00"))
                except ValueError:
                    modified_at = None

            models.append(
                OllamaModel(
                    name=item.get("name", ""),
                    size=item.get("size"),
                    modified_at=modified_at,
                    digest=item.get("digest"),
                    family=details.get("family"),
                    parameter_size=details.get("parameter_size"),
                    quantization_level=details.get("quantization_level"),
                )
            )

        return sorted(models, key=lambda m: m.name.lower())

    async def chat_stream(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        body: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {"temperature": temperature},
        }
        if max_tokens is not None:
            body["options"]["num_predict"] = max_tokens

        async with self._client() as client:
            async with client.stream("POST", "/api/chat", json=body) as response:
                if response.status_code >= 400:
                    detail = await response.aread()
                    raise OllamaError(detail.decode() or f"Ollama chat failed ({response.status_code})")

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    if chunk.get("error"):
                        raise OllamaError(str(chunk["error"]))

                    message = chunk.get("message") or {}
                    content = message.get("content")
                    if content:
                        yield content

                    if chunk.get("done"):
                        break
