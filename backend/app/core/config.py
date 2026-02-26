"""
CounselAI – Backend Configuration
All settings via environment variables with sensible defaults.
"""
from __future__ import annotations

import os
import secrets
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = "CounselAI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_hex(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24       # 24 h
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    BCRYPT_ROUNDS: int = 12

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://counselai:secret@localhost:5432/counselai",
    )
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # ── Model Microservice ────────────────────────────────────────────────────
    MODEL_SERVICE_URL: str = os.getenv("MODEL_SERVICE_URL", "http://model-service:8001")
    MODEL_SERVICE_TIMEOUT: int = 120

    # ── File Storage ──────────────────────────────────────────────────────────
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/app/uploads")
    MAX_FILE_SIZE_MB: int = 25
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    ]

    # ── Subscription Tiers ────────────────────────────────────────────────────
    FREE_MONTHLY_ANALYSES: int = 3
    PRO_MONTHLY_ANALYSES: int = 50
    ENTERPRISE_MONTHLY_ANALYSES: int = 10_000

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://counselai.app",
    ]

    # ── Email (optional SMTP) ─────────────────────────────────────────────────
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # ── Stripe (optional) ─────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
