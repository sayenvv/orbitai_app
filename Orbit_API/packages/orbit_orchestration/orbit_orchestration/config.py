from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class OrchestrationSettings(BaseSettings):
    """LLM settings for multi-agent orchestration (AutoGen + LangChain)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # "ollama" | "openai" — defaults to ollama for local dev
    llm_provider: str = Field(default="ollama", validation_alias="ORCHESTRATION_LLM_PROVIDER")
    openai_api_key: str = ""
    orchestration_model: str = Field(default="", validation_alias="ORCHESTRATION_MODEL")
    ollama_base_url: str = Field(
        default="http://localhost:11434",
        validation_alias="OLLAMA_BASE_URL",
    )
    ollama_api_key: str = "ollama"
    orchestration_temperature: float = 0.4
    max_team_turns: int = 12
    image_default_aspect_ratio: str = "1:1"
    image_default_style: str = "modern"

    @property
    def is_ollama(self) -> bool:
        return self.llm_provider.strip().lower() == "ollama"

    def ollama_openai_base_url(self) -> str:
        """OpenAI-compatible base URL for Ollama (…/v1)."""
        base = self.ollama_base_url.rstrip("/")
        if base.endswith("/v1"):
            return base
        return f"{base}/v1"

    def resolved_model(self, *, ollama_default: str = "llama3.2", openai_default: str = "gpt-4o-mini") -> str:
        if self.orchestration_model.strip():
            return self.orchestration_model.strip()
        return ollama_default if self.is_ollama else openai_default


def get_orchestration_settings() -> OrchestrationSettings:
    return OrchestrationSettings()
