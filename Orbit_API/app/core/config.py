from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Orbit API"
    debug: bool = False
    secret_key: str = "change-me"
    database_url: str = "postgresql+psycopg://orbit:orbit@localhost:5432/orbit"
    cors_origins: str = "http://localhost:3001,http://localhost:3003,http://localhost:3004"
    openai_api_key: str = ""
    auth_cookie_name: str = "orbit_session"
    auth_cookie_max_age: int = 604800
    control_center_data_dir: str = "../Orbit_UI/apps/control_center_app/src/data"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
