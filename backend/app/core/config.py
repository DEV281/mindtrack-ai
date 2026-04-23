"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from pathlib import Path
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings sourced from environment / .env file."""

    # App
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://mindtrack:mindtrack_pass@localhost:5432/mindtrack"
    DATABASE_URL_SYNC: str = "postgresql://mindtrack:mindtrack_pass@localhost:5432/mindtrack"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production-immediately"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # Google OAuth2
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    # reCAPTCHA
    RECAPTCHA_SECRET_KEY: str = ""

    # HuggingFace
    HUGGINGFACE_TOKEN: str = ""

    # Groq AI
    GROQ_API_KEY: str = ""

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    # AI / Safety thresholds
    CRISIS_STRESS_THRESHOLD: int = 85
    CRISIS_ANXIETY_THRESHOLD: int = 80
    MAX_CONVERSATION_HISTORY: int = 30
    AI_STREAM_CHUNK_DELAY_MS: int = 0
    SESSION_RATE_LIMIT_MESSAGES: int = 60

    # Kaggle
    KAGGLE_USERNAME: str = ""
    KAGGLE_KEY: str = ""

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # Paths
    BASE_DIR: str = str(Path(__file__).resolve().parent.parent.parent)
    DATA_DIR: str = str(Path(__file__).resolve().parent.parent.parent / "data")
    PRETRAINED_DIR: str = str(Path(__file__).resolve().parent.parent.parent / "data" / "pretrained")

    # Demo credentials
    DEMO_EMAIL: str = "demo@mindtrack.ai"
    DEMO_PASSWORD: str = "Demo@1234"
    DEMO_MODE: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
