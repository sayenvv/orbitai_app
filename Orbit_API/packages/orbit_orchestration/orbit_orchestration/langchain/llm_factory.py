from langchain_openai import ChatOpenAI

from orbit_orchestration.config import OrchestrationSettings, get_orchestration_settings


def create_chat_model(settings: OrchestrationSettings | None = None) -> ChatOpenAI:
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

    return ChatOpenAI(
        model=model,
        temperature=temperature,
        api_key=cfg.openai_api_key or None,
    )
