"""Single reusable agent factory — all roles are config-driven."""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

from agent_framework import Agent
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import AzureChatOpenAI, ChatOpenAI

from app.core.config import settings
from app.models.ai_platform import PlatformAgentConfig
from app.services.ai_platform.types import AgentConfigDTO
from app.services.code_workspace.clovops.maf.client import create_maf_chat_client
from app.services.token_usage import estimate_tokens


_JSON_BLOCK = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)
_FILE_PATH_HINT = re.compile(r'"file_path"\s*:\s*"([^"]+)"')
_DEFAULT_LLM_TIMEOUT_SECONDS = 180
_WORKFLOW_AGENT_TIMEOUT_SECONDS = 300
_SLOW_AGENT_ROLES = frozenset(
    {
        "code_generation",
        "fix",
        "review",
        "documentation",
        "artifact",
        "validation",
        "architecture",
    }
)


class CommonAgent:
    """One agent instance created from admin DB configuration."""

    def __init__(self, config: PlatformAgentConfig | AgentConfigDTO):
        if isinstance(config, PlatformAgentConfig):
            self.config = AgentConfigDTO(
                id=str(config.id),
                name=config.name,
                role_key=config.role_key,
                description=config.description,
                system_prompt=config.system_prompt,
                model_provider=config.model_provider,
                model_name=config.model_name,
                temperature=config.temperature,
                max_tokens=config.max_tokens,
                tools=list(config.tools or []),
                context_policy=dict(config.context_policy or {}),
                retry_policy=dict(config.retry_policy or {}),
                allowed_file_access=dict(config.allowed_file_access or {}),
                workflow_stage=config.workflow_stage,
                enabled=config.enabled,
            )
        else:
            self.config = config

        self._maf_agent = Agent(
            client=create_maf_chat_client(),
            name=self.config.name,
            description=self.config.description or self.config.role_key,
            instructions=self.config.system_prompt,
        )
        self._langchain = self._build_chat_model()

    def _resolve_provider(self) -> str:
        agent_provider = (self.config.model_provider or "").strip().lower()
        global_provider = settings.llm_provider.strip().lower()

        if agent_provider in {"azure_openai", "azure"}:
            return "azure_openai"
        if agent_provider == "ollama":
            return "ollama"

        # Seeded agents default to "openai" — follow global LLM_PROVIDER from .env.
        if global_provider == "azure_openai" and settings.azure_openai_api_key.strip():
            return "azure_openai"
        if global_provider == "ollama":
            return "ollama"
        return agent_provider or global_provider or "openai"

    def _effective_max_tokens(self) -> int:
        """Reasoning models (e.g. gpt-5) consume tokens before visible JSON output."""
        base = int(self.config.max_tokens or 4096)
        if self._resolve_provider() != "azure_openai":
            return base
        if self.config.role_key in {"code_generation", "fix"}:
            return max(base, 32768)
        if self.config.role_key in {"architecture", "documentation"}:
            return max(base, 16384)
        return max(base, 8192)

    def _azure_reasoning_effort(self) -> str | None:
        """Reasoning models burn output tokens before visible JSON — minimize for codegen."""
        if self.config.role_key in {
            "code_generation",
            "fix",
            "validation",
            "review",
            "documentation",
            "artifact",
        }:
            return "none"
        if self.config.role_key in {"architecture", "planning"}:
            return "low"
        return None

    def _agent_timeout_seconds(self) -> int:
        configured = self.config.retry_policy.get("timeout_seconds")
        if configured is not None:
            return int(configured)
        if self.config.role_key in _SLOW_AGENT_ROLES:
            return _WORKFLOW_AGENT_TIMEOUT_SECONDS
        return int(
            getattr(settings, "ai_platform_llm_timeout_seconds", _DEFAULT_LLM_TIMEOUT_SECONDS)
        )

    def _build_chat_model(self):
        provider = self._resolve_provider()
        model = self.config.model_name
        temperature = self.config.temperature
        max_tokens = self._effective_max_tokens()

        if provider == "azure_openai":
            deployment = settings.azure_openai_chat_deployment.strip() or model
            if not settings.azure_openai_endpoint.strip() or not settings.azure_openai_api_key.strip():
                raise ValueError(
                    "Azure OpenAI requires AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in Orbit_API/.env"
                )
            azure_kwargs: dict[str, Any] = {
                "azure_deployment": deployment,
                "azure_endpoint": settings.azure_openai_endpoint.strip(),
                "api_key": settings.azure_openai_api_key.strip(),
                "api_version": settings.azure_openai_api_version,
                "temperature": 1,
                "max_tokens": max_tokens,
                "model_kwargs": self._json_model_kwargs(),
            }
            reasoning_effort = self._azure_reasoning_effort()
            if reasoning_effort is not None:
                azure_kwargs["reasoning_effort"] = reasoning_effort
            return AzureChatOpenAI(**azure_kwargs)

        if provider == "ollama":
            return ChatOpenAI(
                model=model or settings.local_llm_default_model,
                temperature=temperature,
                base_url=f"{settings.local_llm_base_url.rstrip('/')}/v1",
                api_key="ollama",
                max_tokens=max_tokens,
            )

        if not settings.openai_api_key.strip():
            raise ValueError(
                "OpenAI requires OPENAI_API_KEY in Orbit_API/.env (or set LLM_PROVIDER=azure_openai / ollama)"
            )
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=settings.openai_api_key.strip(),
            max_tokens=max_tokens,
            model_kwargs=self._json_model_kwargs(),
        )

    def _json_model_kwargs(self) -> dict[str, Any]:
        """Request JSON-shaped responses for structured workflow agents."""
        if self.config.role_key in {
            "intent_classifier",
            "requirement",
            "planning",
            "architecture",
            "task_breakdown",
            "code_generation",
            "validation",
            "fix",
            "review",
            "documentation",
            "artifact",
        }:
            return {"response_format": {"type": "json_object"}}
        return {}

    @property
    def role_key(self) -> str:
        return self.config.role_key

    @property
    def tool_names(self) -> list[str]:
        return list(self.config.tools)

    async def run_text(self, user_prompt: str) -> tuple[str, dict[str, int]]:
        messages = [
            SystemMessage(content=self.config.system_prompt),
            HumanMessage(content=user_prompt),
        ]
        timeout = self._agent_timeout_seconds()
        try:
            response = await asyncio.wait_for(
                self._langchain.ainvoke(messages),
                timeout=timeout,
            )
        except TimeoutError as exc:
            raise TimeoutError(
                f"Agent {self.config.name} timed out after {timeout}s"
            ) from exc
        except Exception as exc:
            message = str(exc)
            if "length limit" in message.lower():
                raise ValueError(
                    f"Agent {self.config.name} hit the output token limit "
                    f"({self._effective_max_tokens()} tokens). "
                    "Reasoning models need headroom beyond visible JSON."
                ) from exc
            raise
        text = self._extract_message_text(response)
        usage = {"token_input": 0, "token_output": 0}
        meta = getattr(response, "response_metadata", None) or {}
        token_usage = meta.get("token_usage") or {}
        usage_meta = getattr(response, "usage_metadata", None) or {}
        usage["token_input"] = int(
            usage_meta.get("input_tokens")
            or token_usage.get("prompt_tokens")
            or token_usage.get("input_tokens")
            or 0
        )
        usage["token_output"] = int(
            usage_meta.get("output_tokens")
            or token_usage.get("completion_tokens")
            or token_usage.get("output_tokens")
            or 0
        )
        if not text.strip():
            parsed = self._extract_parsed_payload(response)
            if parsed is not None:
                text = json.dumps(parsed, ensure_ascii=False)
        if usage["token_input"] == 0 and usage["token_output"] == 0:
            usage["token_input"] = estimate_tokens(
                f"{self.config.system_prompt}\n{user_prompt}"
            )
            usage["token_output"] = estimate_tokens(text)
        return text, usage

    async def run_json(self, user_prompt: str) -> tuple[dict[str, Any], dict[str, int]]:
        max_repairs = int(self.config.retry_policy.get("max_retries", 2))
        if self.config.role_key in {"code_generation", "fix"}:
            max_repairs = max(max_repairs, 4)
        prompt = (
            f"{user_prompt}\n\nReturn valid JSON only. No markdown unless inside a json code block."
        )
        last_error = "invalid json"
        total_usage = {"token_input": 0, "token_output": 0}

        for attempt in range(max_repairs + 1):
            text, usage = await self.run_text(prompt)
            total_usage["token_input"] += usage["token_input"]
            total_usage["token_output"] += usage["token_output"]
            if not text.strip():
                last_error = "empty model response"
                prompt = (
                    f"{user_prompt}\n\nYour previous response was empty. "
                    'Return a compact JSON object only, e.g. {"files":[{"path":"index.html","content":"..."}]}. '
                    "Keep file content under 200 lines."
                )
                continue
            try:
                return self._parse_json(text), total_usage
            except json.JSONDecodeError as exc:
                last_error = str(exc)
                coerced = self._coerce_code_payload(text, user_prompt)
                if coerced is not None:
                    return coerced, total_usage
                prompt = (
                    f"{user_prompt}\n\nYour previous response was invalid JSON: {last_error}. "
                    "Return corrected JSON only. Escape quotes and newlines inside content strings."
                )

        raise ValueError(f"Agent {self.config.name} failed to produce valid JSON: {last_error}")

    @staticmethod
    def _extract_message_text(response: Any) -> str:
        kwargs = getattr(response, "additional_kwargs", None) or {}
        refusal = kwargs.get("refusal")
        if refusal:
            return str(refusal)

        content = getattr(response, "content", response)
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for block in content:
                if isinstance(block, str):
                    parts.append(block)
                elif isinstance(block, dict):
                    block_type = str(block.get("type") or "").lower()
                    if block_type in {"text", "output_text", "message"}:
                        parts.append(str(block.get("text") or block.get("content") or ""))
                    elif "text" in block or "content" in block:
                        parts.append(str(block.get("text") or block.get("content") or ""))
                else:
                    text = getattr(block, "text", None)
                    if text:
                        parts.append(str(text))
            return "".join(parts)
        return str(content or "")

    @staticmethod
    def _extract_parsed_payload(response: Any) -> dict[str, Any] | None:
        additional = getattr(response, "additional_kwargs", None) or {}
        parsed = additional.get("parsed")
        if parsed is None:
            return None
        if isinstance(parsed, dict):
            return parsed
        model_dump = getattr(parsed, "model_dump", None)
        if callable(model_dump):
            dumped = model_dump()
            if isinstance(dumped, dict):
                return dumped
        return None

    def _coerce_code_payload(self, text: str, user_prompt: str) -> dict[str, Any] | None:
        if self.config.role_key not in {"code_generation", "fix"}:
            return None
        stripped = text.strip()
        if not stripped or stripped.startswith("{"):
            return None
        if stripped.startswith("```"):
            fence = _JSON_BLOCK.search(stripped)
            if fence:
                stripped = fence.group(1).strip()
        if not stripped or stripped.startswith("{"):
            return None
        match = _FILE_PATH_HINT.search(user_prompt)
        path = match.group(1) if match else "index.html"
        if self.config.role_key == "fix":
            return {"patches": [{"path": path, "operation": "replace", "content": stripped}]}
        return {"files": [{"path": path, "content": stripped}]}

    @staticmethod
    def _parse_json(text: str) -> dict[str, Any]:
        stripped = text.strip()
        match = _JSON_BLOCK.search(stripped)
        if match:
            stripped = match.group(1).strip()
        if not stripped:
            raise json.JSONDecodeError("Empty response", text, 0)
        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            start = stripped.find("{")
            end = stripped.rfind("}")
            if start >= 0 and end > start:
                parsed = json.loads(stripped[start : end + 1])
            else:
                raise
        if not isinstance(parsed, dict):
            raise json.JSONDecodeError("Expected JSON object", stripped, 0)
        return parsed


class CommonAgentFactory:
    @staticmethod
    def from_db_row(row: PlatformAgentConfig) -> CommonAgent:
        return CommonAgent(row)

    @staticmethod
    def from_dto(dto: AgentConfigDTO) -> CommonAgent:
        return CommonAgent(dto)
