from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas import LlmModelListResponse, LlmModelResponse, LlmStatusResponse
from clovai import LlmError, get_settings, get_status, list_installed_models

router = APIRouter(prefix="/llm", tags=["llm"])


@router.get("/status", response_model=LlmStatusResponse)
async def llm_status():
    provider = settings.llm_provider.strip().lower()

    if provider == "azure_openai":
        available = bool(
            settings.azure_openai_endpoint.strip() and settings.azure_openai_api_key.strip()
        )
        return LlmStatusResponse(
            available=available,
            base_url=settings.azure_openai_endpoint.strip(),
            default_model=settings.azure_openai_chat_deployment or "gpt-4o",
            provider=settings.llm_provider,
        )

    if provider == "openai":
        return LlmStatusResponse(
            available=bool(settings.openai_api_key.strip()),
            base_url="https://api.openai.com/v1",
            default_model="gpt-4o-mini",
            provider=settings.llm_provider,
        )

    status = await get_status(
        get_settings(
            base_url=settings.local_llm_base_url,
            default_model=settings.local_llm_default_model,
            timeout=settings.local_llm_timeout,
        )
    )
    return LlmStatusResponse(
        available=status.available,
        base_url=status.base_url,
        default_model=status.default_model,
        provider=settings.llm_provider,
    )


@router.get("/models", response_model=LlmModelListResponse)
async def list_llm_models():
    llm_settings = get_settings(
        base_url=settings.local_llm_base_url,
        default_model=settings.local_llm_default_model,
        timeout=settings.local_llm_timeout,
    )
    try:
        models = await list_installed_models(llm_settings)
    except LlmError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return LlmModelListResponse(
        data=[
            LlmModelResponse(
                name=m.name,
                size=m.size,
                modified_at=m.modified_at,
                digest=m.digest,
                family=m.family,
                parameter_size=m.parameter_size,
                quantization_level=m.quantization_level,
            )
            for m in models
        ]
    )
