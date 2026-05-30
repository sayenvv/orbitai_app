from pydantic_settings import BaseSettings, SettingsConfigDict


class OllamaSettings(BaseSettings):
    """Ollama connection settings (reads OLLAMA_* env vars)."""

    model_config = SettingsConfigDict(env_prefix="OLLAMA_", extra="ignore")

    base_url: str = "http://localhost:11434"
    default_model: str = "llama3.2"
    timeout: float = 120.0

    @property
    def base_url_normalized(self) -> str:
        return self.base_url.rstrip("/")
