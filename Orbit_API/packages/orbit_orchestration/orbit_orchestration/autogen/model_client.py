from autogen_core.models import ChatCompletionClient, ModelFamily
from autogen_ext.models.openai import (
    AzureOpenAIChatCompletionClient,
    OpenAIChatCompletionClient,
)

from orbit_orchestration.config import OrchestrationSettings, get_orchestration_settings

_OLLAMA_MODEL_INFO = {
    "vision": False,
    "function_calling": True,
    "json_output": False,
    "family": ModelFamily.UNKNOWN,
    "structured_output": False,
}

_AZURE_MODEL_INFO = {
    "vision": True,
    "function_calling": True,
    "json_output": True,
    "family": ModelFamily.GPT_4O,
    "structured_output": True,
}


def create_model_client(settings: OrchestrationSettings | None = None) -> ChatCompletionClient:
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

    if cfg.is_azure:
        if not cfg.azure_openai_endpoint.strip() or not cfg.azure_openai_api_key.strip():
            raise ValueError(
                "Azure OpenAI requires AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY "
                "when LLM_PROVIDER=azure_openai."
            )
        return AzureOpenAIChatCompletionClient(
            azure_deployment=cfg.azure_openai_chat_deployment,
            model=model,
            azure_endpoint=cfg.azure_openai_endpoint.strip(),
            api_key=cfg.azure_openai_api_key.strip(),
            api_version=cfg.azure_openai_api_version,
            # gpt-5 / o-series reasoning deployments only accept the default
            # temperature (1); sending any other value is a 400.
            temperature=1,
            model_info=_AZURE_MODEL_INFO,
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
