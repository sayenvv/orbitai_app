from autogen_core.models import ModelFamily
from autogen_ext.models.openai import OpenAIChatCompletionClient

from orbit_orchestration.config import OrchestrationSettings, get_orchestration_settings

_OLLAMA_MODEL_INFO = {
    "vision": False,
    "function_calling": True,
    "json_output": False,
    "family": ModelFamily.UNKNOWN,
    "structured_output": False,
}


def create_model_client(settings: OrchestrationSettings | None = None) -> OpenAIChatCompletionClient:
    cfg = settings or get_orchestration_settings()
    model = cfg.resolved_model()
    temperature = cfg.orchestration_temperature

    if cfg.is_ollama:
        return OpenAIChatCompletionClient(
            model=model,
            base_url=cfg.ollama_openai_base_url(),
            api_key=cfg.ollama_api_key or "ollama",
            temperature=temperature,
            model_info=_OLLAMA_MODEL_INFO,
        )

    if not cfg.openai_api_key.strip():
        raise ValueError(
            "OPENAI_API_KEY is required for multi-agent orchestration when "
            "ORCHESTRATION_LLM_PROVIDER=openai (or LLM_PROVIDER=openai)."
        )
    return OpenAIChatCompletionClient(
        model=model,
        api_key=cfg.openai_api_key,
        temperature=temperature,
    )
