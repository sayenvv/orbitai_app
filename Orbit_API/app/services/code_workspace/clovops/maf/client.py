from __future__ import annotations

from agent_framework.openai import OpenAIChatClient

from orbit_orchestration.config import OrchestrationSettings, get_orchestration_settings


def create_maf_chat_client(settings: OrchestrationSettings | None = None) -> OpenAIChatClient:
    """Build an Agent Framework chat client from Orbit orchestration settings.

    Note: ``OpenAIChatClient`` uses the OpenAI *Responses* API. On Azure this requires
    ``api-version=preview`` (or ``AZURE_OPENAI_MAF_API_VERSION``), which is separate
    from ``AZURE_OPENAI_API_VERSION`` used by LangChain chat-completions.
    """
    cfg = settings or get_orchestration_settings()
    model = cfg.resolved_model()

    if cfg.is_ollama:
        return OpenAIChatClient(
            model=model,
            api_key=cfg.ollama_api_key or "ollama",
            base_url=cfg.ollama_openai_base_url(),
        )

    if cfg.is_azure:
        if not cfg.azure_openai_endpoint.strip() or not cfg.azure_openai_api_key.strip():
            raise ValueError(
                "Azure OpenAI requires AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY "
                "when LLM_PROVIDER=azure_openai."
            )
        maf_api_version = cfg.azure_openai_maf_api_version.strip() or "preview"
        return OpenAIChatClient(
            model=model,
            azure_endpoint=cfg.azure_openai_endpoint.strip(),
            api_key=cfg.azure_openai_api_key.strip(),
            api_version=maf_api_version,
        )

    return OpenAIChatClient(
        model=model,
        api_key=cfg.openai_api_key or None,
    )
