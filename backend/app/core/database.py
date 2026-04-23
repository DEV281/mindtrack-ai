"""Async SQLAlchemy database engine and session factory."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """Yield an async database session for dependency injection."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables (used in development / startup)."""
    async with engine.begin() as conn:
        from app.db.models import (  # noqa: F401
            User, Session, AnalysisReading, Report,
            Consultation, ConsultationMessage, AssessmentResult,
            ActivityMoodLog, GratitudeEntry,
        )
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Dispose engine connections."""
    await engine.dispose()
