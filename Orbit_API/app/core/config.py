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
    auth_cookie_name: str = "orbit_session"  # legacy; cleared on realm login
    auth_cookie_chat: str = "orbit_chat_session"
    auth_cookie_control: str = "orbit_control_session"
    auth_cookie_admin: str = "orbit_admin_session"
    auth_cookie_max_age: int = 604800
    control_center_data_dir: str = "../Orbit_UI/apps/control_center_app/src/data"
    ollama_base_url: str = "http://localhost:11434"
    ollama_default_model: str = "llama3.2"
    ollama_timeout: float = 120.0

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
    def use_ollama(self) -> bool:
        return self.llm_provider.strip().lower() == "ollama"


settings = Settings()
