"""Async SQLAlchemy database engine and session factory."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# Production-safe engine configuration
_connect_args = {}
_db_url = settings.DATABASE_URL

# Supabase pooler requires SSL
if "supabase.com" in _db_url or "pooler.supabase.com" in _db_url:
    import ssl
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    _connect_args["ssl"] = ssl_ctx

engine = create_async_engine(
    _db_url,
    echo=False,  # Disable SQL echo in production
    pool_size=5,  # Conservative for free-tier DBs
    max_overflow=3,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=_connect_args,
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
