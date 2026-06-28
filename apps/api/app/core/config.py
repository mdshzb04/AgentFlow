from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


from app.core.voice_prompt import AGENTFLOW_VOICE_SYSTEM_PROMPT


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        env_ignore_empty=True,
    )

    # App
    environment: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Database
    database_url: str = "postgresql+asyncpg://agentflow:agentflow_secret@localhost:5432/agentflow"

    # Security
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""
    github_callback_url: str = "http://localhost:8000/api/v1/auth/github/callback"

    # Frontend
    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"
    api_public_url: str = "http://localhost:8000"

    # AI Providers
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    notion_api_key: str = ""
    default_openai_model: str = "gpt-4o"
    default_anthropic_model: str = "claude-sonnet-4-20250514"
    default_llm_provider: str = "openai"
    openai_tts_model: str = "tts-1"
    openai_stt_model: str = "whisper-1"
    agentflow_voice_system_prompt: str = AGENTFLOW_VOICE_SYSTEM_PROMPT

    # Google OAuth (Gmail + Sheets)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/integrations/google/callback"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
