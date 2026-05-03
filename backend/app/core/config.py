from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import List
from functools import lru_cache
from pathlib import Path

# Resolve .env relative to this file's location (backend/.env)
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # App
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # JWT (alternative naming from .env)
    JWT_SECRET: str = ""
    JWT_EXPIRE_MINUTES: int = 10080

    # Single user credentials (set these in .env)
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str = ""

    # MongoDB (supports both MONGO_URI and MONGODB_URL naming)
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "seethru_db"
    MONGO_URI: str = ""
    MONGO_DB_NAME: str = ""
    MONGO_TIMEOUT_MS: int = 5000

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Groq API
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    GROQ_MAX_TOKENS: int = 512
    GROQ_TEMPERATURE: float = 0.1
    GROQ_REQUEST_TIMEOUT: int = 30
    GROQ_MAX_RETRIES: int = 2
    GROQ_FALLBACK_MODELS: str = "llama-3.1-8b-instant,gemma2-9b-it,llama3-8b-8192"

    # Agent
    AGENT_MAX_ITERATIONS: int = 5
    AGENT_TIMEOUT: int = 90

    # Web scraping
    WEB_SEARCH_MAX_CHARS: int = 3000
    ARTICLE_MAX_CHARS: int = 2000
    HTTP_TIMEOUT: int = 10
    USER_AGENT: str = "FactCheck-Bot/1.0"

    # News
    NEWS_API_KEY: str = ""
    NEWS_API_BASE_URL: str = "https://newsapi.org/v2"
    NEWS_CACHE_TTL_SECONDS: int = 300
    GEO_CACHE_TTL_SECONDS: int = 3600
    GEO_LOOKUP_URL: str = "http://ip-api.com/json"
    DEFAULT_COUNTRY: str = "in"

    # Alert thresholds
    ALERT_FALSE_CONFIDENCE: float = 0.8
    ALERT_MISLEADING_CONFIDENCE: float = 0.85
    HUMAN_REVIEW_CONFIDENCE_THRESHOLD: float = 0.65
    DUPLICATE_SCORE_THRESHOLD: float = 8.0

    @model_validator(mode="after")
    def resolve_mongo_aliases(self):
        # If MONGO_URI is set in .env, use it as MONGODB_URL
        if self.MONGO_URI:
            self.MONGODB_URL = self.MONGO_URI
        if self.MONGO_DB_NAME:
            self.MONGODB_DB_NAME = self.MONGO_DB_NAME
        # Use JWT_SECRET as SECRET_KEY if set
        if self.JWT_SECRET:
            self.SECRET_KEY = self.JWT_SECRET
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
