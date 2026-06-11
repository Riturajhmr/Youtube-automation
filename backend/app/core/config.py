from __future__ import annotations

from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

# ProviderType is defined in the ai_provider leaf module (no internal imports),
# so importing it here is safe and does not create a circular dependency.
from app.services.ai_provider import ProviderType


class Settings(BaseSettings):
    APP_NAME: str = "TubeFlow"
    APP_VERSION: str = "0.1.0"
    LOG_LEVEL: str = "INFO"

    AI_PROVIDER: ProviderType = ProviderType.ANTHROPIC
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None

    TRANSCRIPT_SERVICE: str = "whisper"       # "whisper" | "placeholder"
    FRAME_EXTRACTION_SERVICE: str = "ffmpeg"  # "ffmpeg" | "placeholder"
    WHISPER_MODEL_SIZE: str = "base"          # tiny | base | small | medium | large-v2

    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    UPLOAD_DIR: str = "uploads"
    MAX_VIDEO_SIZE_MB: int = 2048  # 2 GB expressed in MB; multiply by 1024*1024 for bytes

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
