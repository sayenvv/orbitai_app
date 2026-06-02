from functools import lru_cache

from orbit_orchestration.config import OrchestrationSettings
from orbit_orchestration.orchestrator import GroupChatOrchestrator

from app.core.config import settings as app_settings


def _orchestration_settings() -> OrchestrationSettings:
    provider = app_settings.llm_provider.strip().lower()
    if provider not in ("ollama", "openai", "azure_openai"):
        provider = "ollama"
    # Azure is not wired for AutoGen group chat yet; fall back to OpenAI key + deployment naming
    if provider == "azure_openai":
        provider = "openai"

    return OrchestrationSettings(
        llm_provider=provider,
        openai_api_key=app_settings.openai_api_key,
        orchestration_model=app_settings.local_llm_default_model
        if provider == "ollama"
        else "gpt-4o-mini",
        ollama_base_url=app_settings.local_llm_base_url,
    )


@lru_cache
def get_group_chat_orchestrator() -> GroupChatOrchestrator:
    return GroupChatOrchestrator(settings=_orchestration_settings())
