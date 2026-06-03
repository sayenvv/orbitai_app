from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "Clovai API"
    # True by default for local dev (HTTP cookies + LAN IP testing). Set DEBUG=false in production.
    debug: bool = True
    secret_key: str = "change-me"
    database_url: str = "postgresql+psycopg://orbit:orbit@localhost:5432/orbit"
    cors_origins: str = (
        "http://localhost:3001,http://localhost:3003,http://localhost:3004,"
        "http://192.168.1.4:3001,http://192.168.1.4:3003,http://192.168.1.4:3004"
    )
    openai_api_key: str = ""
    llm_provider: str = "openai"  # "openai" | "ollama" | "azure_openai"
    auth_cookie_name: str = "orbit_session"  # legacy; cleared on realm login
    auth_cookie_chat: str = "orbit_chat_session"
    auth_cookie_control: str = "orbit_control_session"
    auth_cookie_admin: str = "orbit_admin_session"
    auth_cookie_max_age: int = 604800
    auth_cookie_secure: bool | None = None
    auth_cookie_samesite: str = "lax"
    rate_limit_auth_per_minute: int = 20
    rate_limit_register_per_minute: int = 5
    rate_limit_upload_per_minute: int = 15
    rate_limit_crawl_per_minute: int = 10
    crawl_max_pages: int = 500
    crawl_fetch_retries: int = 3
    crawl_fetch_retry_delay_seconds: float = 1.0
    rate_limit_chat_stream_per_minute: int = 40
    control_center_data_dir: str = "../Orbit_UI/apps/control_center_app/src/data"
    local_llm_base_url: str = Field(default="http://localhost:11434", validation_alias="OLLAMA_BASE_URL")
    local_llm_default_model: str = Field(default="llama3.2", validation_alias="OLLAMA_DEFAULT_MODEL")
    local_llm_timeout: float = Field(default=120.0, validation_alias="OLLAMA_TIMEOUT")

    # Azure OpenAI (used when plan ai_stack selects azure_openai)
    azure_openai_endpoint: str = ""
    azure_openai_api_key: str = ""
    azure_openai_api_version: str = "2024-02-01"
    azure_openai_chat_deployment: str = "gpt-4o"
    azure_openai_embedding_deployment: str = "text-embedding-3-small"
    azure_openai_embedding_dimensions: int = 1536

    # Monthly token limits per plan (0 = unlimited). See app/core/plan_limits.py
    free_plan_token_limit: int = 2_000
    starter_plan_token_limit: int = 500_000
    pro_plan_token_limit: int = 2_000_000
    enterprise_plan_token_limit: int = 0

    # RAG / document upload
    rag_upload_dir: str = "data/rag_uploads"
    # Auto-write Photo Studio canvas shapes/texts to JSON while editing (local dev).
    photo_studio_canvas_export_enabled: bool = True
    photo_studio_canvas_export_dir: str = "data/photo_studio_canvas_exports"
    rag_max_file_bytes: int = 20 * 1024 * 1024  # 20 MB
    rag_free_max_pages: int = 20
    rag_chunk_size: int = 900
    rag_chunk_overlap: int = 150
    rag_top_k: int = 5
    rag_embedding_model: str = "BAAI/bge-small-en-v1.5"
    rag_embedding_dimensions: int = 384
    # auto = Celery if broker reachable, else FastAPI BackgroundTasks
    rag_ingest_mode: str = "auto"  # auto | celery | background | sync
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def cookie_secure(self) -> bool:
        if self.auth_cookie_secure is not None:
            return self.auth_cookie_secure
        return not self.debug

    @property
    def use_strict_transport_security(self) -> bool:
        return self.cookie_secure

    @property
    def cookie_samesite(self) -> str:
        value = self.auth_cookie_samesite.strip().lower()
        if value not in {"lax", "strict", "none"}:
            return "lax"
        if value == "none" and not self.cookie_secure:
            return "lax"
        return value

    @property
    def use_local_llm(self) -> bool:
        return self.llm_provider.strip().lower() == "ollama"


settings = Settings()
