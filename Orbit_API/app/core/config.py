from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Orbit API"
    debug: bool = False
    secret_key: str = "change-me"
    database_url: str = "postgresql+psycopg://orbit:orbit@localhost:5432/orbit"
    cors_origins: str = "http://localhost:3001,http://localhost:3003,http://localhost:3004"
    openai_api_key: str = ""
    llm_provider: str = "openai"  # "openai" | "ollama"
    auth_cookie_name: str = "orbit_session"
    auth_cookie_max_age: int = 604800
    control_center_data_dir: str = "../Orbit_UI/apps/control_center_app/src/data"
    ollama_base_url: str = "http://localhost:11434"
    ollama_default_model: str = "llama3.2"
    ollama_timeout: float = 120.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def use_ollama(self) -> bool:
        return self.llm_provider.strip().lower() == "ollama"


settings = Settings()
