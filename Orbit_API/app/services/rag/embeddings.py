from __future__ import annotations

from functools import lru_cache

import httpx
from langchain_openai import AzureOpenAIEmbeddings

from app.core.config import settings
from app.services.plan_ai_stack import EmbeddingStackConfig, PlanAiStack


@lru_cache(maxsize=8)
def _fastembed_model(model_name: str):
    from fastembed import TextEmbedding

    return TextEmbedding(model_name=model_name)


def _embed_fastembed(texts: list[str], *, model_name: str) -> list[list[float]]:
    model = _fastembed_model(model_name)
    return [vector.tolist() for vector in model.embed(texts)]


def _embed_ollama(texts: list[str], *, model_name: str) -> list[list[float]]:
    payload = {"model": model_name, "input": texts}
    with httpx.Client(base_url=settings.ollama_base_url, timeout=settings.ollama_timeout) as client:
        response = client.post("/api/embed", json=payload)
        response.raise_for_status()
        data = response.json()
    embeddings = data.get("embeddings")
    if not isinstance(embeddings, list):
        raise ValueError("Ollama embedding response missing embeddings")
    return embeddings


def _embed_azure(texts: list[str], *, config: EmbeddingStackConfig) -> list[list[float]]:
    deployment = (config.deployment or config.model).strip()
    if not settings.azure_openai_endpoint.strip() or not settings.azure_openai_api_key.strip():
        raise ValueError("Azure OpenAI credentials are not configured on the server")
    model = AzureOpenAIEmbeddings(
        azure_deployment=deployment,
        azure_endpoint=settings.azure_openai_endpoint.strip(),
        api_key=settings.azure_openai_api_key.strip(),
        api_version=settings.azure_openai_api_version,
        model=config.model,
    )
    return model.embed_documents(texts)


def embed_texts(texts: list[str], stack: PlanAiStack | None = None) -> list[list[float]]:
    if not texts:
        return []

    config = (stack or PlanAiStack()).embeddings
    if config.provider == "azure_openai":
        return _embed_azure(texts, config=config)
    if config.provider == "ollama":
        return _embed_ollama(texts, model_name=config.model)
    return _embed_fastembed(texts, model_name=config.model)


def embed_query(text: str, stack: PlanAiStack | None = None) -> list[float]:
    vectors = embed_texts([text], stack=stack)
    return vectors[0] if vectors else []


def embedding_stack_from_metadata(metadata: dict | None) -> PlanAiStack | None:
    if not metadata:
        return None
    raw = metadata.get("embedding_stack")
    if not isinstance(raw, dict):
        return None
    from app.services.plan_ai_stack import parse_ai_stack

    return parse_ai_stack({"embeddings": raw})
