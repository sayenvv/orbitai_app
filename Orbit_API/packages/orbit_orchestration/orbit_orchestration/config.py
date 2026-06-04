from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class OrchestrationSettings(BaseSettings):
    """LLM settings for multi-agent orchestration (AutoGen + LangChain)."""

    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", populate_by_name=True
    )

    # "ollama" | "openai" | "azure_openai" — defaults to ollama for local dev.
    # Falls back to the shared LLM_PROVIDER when ORCHESTRATION_LLM_PROVIDER is unset.
    llm_provider: str = Field(
        default="ollama",
        validation_alias=AliasChoices("ORCHESTRATION_LLM_PROVIDER", "LLM_PROVIDER"),
    )
    openai_api_key: str = ""
    orchestration_model: str = Field(default="", validation_alias="ORCHESTRATION_MODEL")
    ollama_base_url: str = Field(
        default="http://localhost:11434",
        validation_alias="OLLAMA_BASE_URL",
    )
    ollama_api_key: str = "ollama"

    # Azure OpenAI (shares the same env vars as the rest of the API).
    azure_openai_endpoint: str = Field(default="", validation_alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_api_key: str = Field(default="", validation_alias="AZURE_OPENAI_API_KEY")
    azure_openai_api_version: str = Field(
        default="2024-02-01", validation_alias="AZURE_OPENAI_API_VERSION"
    )
    azure_openai_chat_deployment: str = Field(
        default="gpt-4o", validation_alias="AZURE_OPENAI_CHAT_DEPLOYMENT"
    )

    orchestration_temperature: float = 0.4
    max_team_turns: int = 12
    image_default_aspect_ratio: str = "1:1"
    image_default_style: str = "modern"

    @property
    def is_ollama(self) -> bool:
        return self.llm_provider.strip().lower() == "ollama"

    @property
    def is_azure(self) -> bool:
        return self.llm_provider.strip().lower() == "azure_openai"

    def ollama_openai_base_url(self) -> str:
        """OpenAI-compatible base URL for Ollama (…/v1)."""
        base = self.ollama_base_url.rstrip("/")
        if base.endswith("/v1"):
            return base
        return f"{base}/v1"

    def resolved_model(self, *, ollama_default: str = "llama3.2", openai_default: str = "gpt-4o-mini") -> str:
        if self.orchestration_model.strip():
            return self.orchestration_model.strip()
        if self.is_azure:
            return self.azure_openai_chat_deployment.strip() or "gpt-4o"
        return ollama_default if self.is_ollama else openai_default


def get_orchestration_settings() -> OrchestrationSettings:
    return OrchestrationSettings()
