import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "InterviewGenius AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production-e7f8a9b0c1d2")
    ALLOWED_ORIGINS: list[str] = ["http://localhost:1993", "https://interviewgenius.ai"]

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./interviewgenius.db")
    DB_ECHO: bool = False

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # JWT Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "jwt-secret-key-change-in-prod")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60 * 24  # 24 hours
    JWT_REFRESH_EXPIRY_DAYS: int = 30

    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = "gpt-4o"
    WHISPER_MODEL: str = "whisper-1"

    # Deepgram (real-time transcription)
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    # Stripe
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_PRO_PRICE_ID: str = os.getenv("STRIPE_PRO_PRICE_ID", "")
    STRIPE_ENTERPRISE_PRICE_ID: str = os.getenv("STRIPE_ENTERPRISE_PRICE_ID", "")

    # AWS S3 (document storage)
    AWS_ACCESS_KEY: str = os.getenv("AWS_ACCESS_KEY", "")
    AWS_SECRET_KEY: str = os.getenv("AWS_SECRET_KEY", "")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "interviewgenius-docs")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")

    # Rate Limiting
    RATE_LIMIT_FREE: int = 10  # requests per day
    RATE_LIMIT_PRO: int = 1000
    RATE_LIMIT_ENTERPRISE: int = 10000

    # Credits
    FREE_DAILY_CREDITS: int = 10
    CREDIT_COST_AI_RESPONSE: int = 1
    CREDIT_COST_MOCK_SESSION: int = 20
    CREDIT_COST_RESUME_ANALYSIS: int = 10
    CREDIT_COST_DOC_UPLOAD: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
