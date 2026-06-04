from langchain_core.language_models import BaseChatModel
from langchain_openai import AzureChatOpenAI, ChatOpenAI

from orbit_orchestration.config import OrchestrationSettings, get_orchestration_settings


def create_chat_model(settings: OrchestrationSettings | None = None) -> BaseChatModel:
    cfg = settings or get_orchestration_settings()
    model = cfg.resolved_model()
    temperature = cfg.orchestration_temperature

    if cfg.is_ollama:
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            base_url=cfg.ollama_openai_base_url(),
            api_key=cfg.ollama_api_key or "ollama",
        )

    if cfg.is_azure:
        if not cfg.azure_openai_endpoint.strip() or not cfg.azure_openai_api_key.strip():
            raise ValueError(
                "Azure OpenAI requires AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY "
                "when LLM_PROVIDER=azure_openai."
            )
        return AzureChatOpenAI(
            azure_deployment=cfg.azure_openai_chat_deployment,
            azure_endpoint=cfg.azure_openai_endpoint.strip(),
            api_key=cfg.azure_openai_api_key.strip(),
            api_version=cfg.azure_openai_api_version,
            # gpt-5 / o-series reasoning deployments only accept the default
            # temperature (1); sending any other value is a 400.
            temperature=1,
        )

    return ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=cfg.openai_api_key or None,
    )
