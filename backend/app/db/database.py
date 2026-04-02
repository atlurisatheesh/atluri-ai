"""
Async SQLAlchemy engine & session factory for local PostgreSQL.
"""

import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger("app.db.database")

_raw_url = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:localdev123@127.0.0.1:5432/linkedin_ai",
)
# Render.com provides postgres:// but asyncpg needs postgresql+asyncpg://
DATABASE_URL = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1) if _raw_url.startswith("postgres://") else _raw_url

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """FastAPI dependency – yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables (idempotent)."""
    from app.db.models import (  # noqa: F401 – ensure models are registered
        User, InterviewSession, AIResponse, Document, MockResult,
        Question, UserQuestionProgress, CreditTransaction, MentorSession,
        ResumeAnalysis, UserMemory,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created / verified")
