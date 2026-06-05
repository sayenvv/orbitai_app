from functools import lru_cache

from orbit_orchestration.config import OrchestrationSettings
from orbit_orchestration.domain.session import SessionStore
from orbit_orchestration.orchestrator import LangGraphOrchestrator

from app.core.config import settings as app_settings

# Shared across chat + /api/multi-agent so resume/HITL works for a session id.
_ORCHESTRATION_STORE = SessionStore()


def _orchestration_settings() -> OrchestrationSettings:
    provider = app_settings.llm_provider.strip().lower()
    if provider not in ("ollama", "openai", "azure_openai"):
        provider = "ollama"

    if provider == "azure_openai":
        return OrchestrationSettings(
            llm_provider="azure_openai",
            azure_openai_endpoint=app_settings.azure_openai_endpoint,
            azure_openai_api_key=app_settings.azure_openai_api_key,
            azure_openai_api_version=app_settings.azure_openai_api_version,
            azure_openai_chat_deployment=app_settings.azure_openai_chat_deployment,
        )

    return OrchestrationSettings(
        llm_provider=provider,
        openai_api_key=app_settings.openai_api_key,
        orchestration_model=app_settings.local_llm_default_model
        if provider == "ollama"
        else "gpt-4o-mini",
        ollama_base_url=app_settings.local_llm_base_url,
    )


def get_orchestration_settings() -> OrchestrationSettings:
    return _orchestration_settings()


@lru_cache
def get_orchestrator() -> LangGraphOrchestrator:
    return LangGraphOrchestrator(settings=_orchestration_settings(), store=_ORCHESTRATION_STORE)


def get_group_chat_orchestrator() -> LangGraphOrchestrator:
    """Backward-compatible alias."""
    return get_orchestrator()
