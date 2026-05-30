from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plan_limits import PLANS
from app.models import PlanLimit

ChatProvider = Literal["ollama", "openai", "azure_openai"]
EmbeddingProvider = Literal["fastembed", "ollama", "azure_openai"]


class ChatStackConfig(BaseModel):
    provider: ChatProvider = "ollama"
    model: str = "llama3.2"
    deployment: str | None = None


class EmbeddingStackConfig(BaseModel):
    provider: EmbeddingProvider = "fastembed"
    model: str = "BAAI/bge-small-en-v1.5"
    deployment: str | None = None
    dimensions: int = 384


class PlanAiStack(BaseModel):
    chat: ChatStackConfig = Field(default_factory=ChatStackConfig)
    embeddings: EmbeddingStackConfig = Field(default_factory=EmbeddingStackConfig)


def default_local_stack() -> PlanAiStack:
    return PlanAiStack(
        chat=ChatStackConfig(provider="ollama", model=settings.ollama_default_model),
        embeddings=EmbeddingStackConfig(
            provider="fastembed",
            model=settings.rag_embedding_model,
            dimensions=settings.rag_embedding_dimensions,
        ),
    )


def default_azure_stack() -> PlanAiStack:
    deployment = settings.azure_openai_chat_deployment or "gpt-4o"
    embed_deployment = settings.azure_openai_embedding_deployment or "text-embedding-3-small"
    return PlanAiStack(
        chat=ChatStackConfig(
            provider="azure_openai",
            model=deployment,
            deployment=deployment,
        ),
        embeddings=EmbeddingStackConfig(
            provider="azure_openai",
            model=embed_deployment,
            deployment=embed_deployment,
            dimensions=settings.azure_openai_embedding_dimensions,
        ),
    )


PLAN_STACK_DEFAULTS: dict[str, PlanAiStack] = {
    "free": default_local_stack(),
    "starter": default_local_stack(),
    "pro": default_azure_stack(),
    "enterprise": default_azure_stack(),
}


def _coerce_chat(raw: Any) -> ChatStackConfig:
    if not isinstance(raw, dict):
        return ChatStackConfig()
    provider = raw.get("provider", "ollama")
    if provider not in ("ollama", "openai", "azure_openai"):
        provider = "ollama"
    model = str(raw.get("model") or settings.ollama_default_model).strip()
    deployment = raw.get("deployment")
    return ChatStackConfig(
        provider=provider,
        model=model,
        deployment=str(deployment).strip() if deployment else None,
    )


def _coerce_embeddings(raw: Any) -> EmbeddingStackConfig:
    if not isinstance(raw, dict):
        return EmbeddingStackConfig()
    provider = raw.get("provider", "fastembed")
    if provider not in ("fastembed", "ollama", "azure_openai"):
        provider = "fastembed"
    model = str(raw.get("model") or settings.rag_embedding_model).strip()
    deployment = raw.get("deployment")
    dimensions = raw.get("dimensions", settings.rag_embedding_dimensions)
    try:
        dimensions = int(dimensions)
    except (TypeError, ValueError):
        dimensions = settings.rag_embedding_dimensions
    return EmbeddingStackConfig(
        provider=provider,
        model=model,
        deployment=str(deployment).strip() if deployment else None,
        dimensions=dimensions,
    )


def parse_ai_stack(raw: Any, *, plan: str | None = None) -> PlanAiStack:
    fallback = PLAN_STACK_DEFAULTS.get(plan or "free", default_local_stack())
    if not isinstance(raw, dict):
        return fallback

    chat = _coerce_chat(raw.get("chat"))
    embeddings = _coerce_embeddings(raw.get("embeddings"))

    if not raw.get("chat"):
        chat = fallback.chat
    if not raw.get("embeddings"):
        embeddings = fallback.embeddings

    return PlanAiStack(chat=chat, embeddings=embeddings)


def ai_stack_to_dict(stack: PlanAiStack) -> dict[str, Any]:
    return stack.model_dump()


def get_plan_ai_stack(db: Session, plan: str) -> PlanAiStack:
    normalized = plan.strip().lower()
    if normalized not in PLANS:
        normalized = "free"

    row = db.query(PlanLimit).filter(PlanLimit.plan == normalized).first()
    if not row:
        return PLAN_STACK_DEFAULTS.get(normalized, default_local_stack())

    return parse_ai_stack(row.ai_stack, plan=normalized)


def validate_ai_stack(stack: PlanAiStack) -> None:
    if stack.chat.provider == "azure_openai":
        deployment = (stack.chat.deployment or stack.chat.model).strip()
        if not deployment:
            raise ValueError("Azure chat requires a deployment name")
    if stack.embeddings.provider == "azure_openai":
        deployment = (stack.embeddings.deployment or stack.embeddings.model).strip()
        if not deployment:
            raise ValueError("Azure embeddings require a deployment name")


def merge_ai_stack_patch(current: PlanAiStack, patch: dict[str, Any]) -> PlanAiStack:
    data = current.model_dump()
    if "chat" in patch and isinstance(patch["chat"], dict):
        chat = {**data["chat"], **patch["chat"]}
        data["chat"] = chat
    if "embeddings" in patch and isinstance(patch["embeddings"], dict):
        embeddings = {**data["embeddings"], **patch["embeddings"]}
        data["embeddings"] = embeddings
    stack = parse_ai_stack(data)
    validate_ai_stack(stack)
    return stack
