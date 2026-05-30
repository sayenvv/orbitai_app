from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas import OllamaModelListResponse, OllamaModelResponse, OllamaStatusResponse
from orbit_ollama import OllamaError, get_settings, get_status, list_installed_models

router = APIRouter(prefix="/ollama", tags=["ollama"])


@router.get("/status", response_model=OllamaStatusResponse)
async def ollama_status():
    status = await get_status(
        get_settings(
            base_url=settings.ollama_base_url,
            default_model=settings.ollama_default_model,
            timeout=settings.ollama_timeout,
        )
    )
    return OllamaStatusResponse(
        available=status.available,
        base_url=status.base_url,
        default_model=status.default_model,
        provider=settings.llm_provider,
    )


@router.get("/models", response_model=OllamaModelListResponse)
async def list_ollama_models():
    ollama_settings = get_settings(
        base_url=settings.ollama_base_url,
        default_model=settings.ollama_default_model,
        timeout=settings.ollama_timeout,
    )
    try:
        models = await list_installed_models(ollama_settings)
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return OllamaModelListResponse(
        data=[
            OllamaModelResponse(
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
