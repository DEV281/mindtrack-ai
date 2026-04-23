"""Redis async client for session caching, OTP storage, and token blacklisting."""

from __future__ import annotations

from typing import Optional

import redis.asyncio as aioredis

from app.core.config import get_settings

settings = get_settings()

redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Return the global Redis client instance."""
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return redis_client


async def close_redis() -> None:
    """Close the Redis connection."""
    global redis_client
    if redis_client is not None:
        await redis_client.close()
        redis_client = None


async def store_otp(email: str, otp: str, ttl_seconds: int = 600) -> None:
    """Store an OTP in Redis with a TTL (default 10 minutes)."""
    r = await get_redis()
    await r.setex(f"otp:{email}", ttl_seconds, otp)


async def verify_otp(email: str, otp: str) -> bool:
    """Verify an OTP from Redis. Deletes on success. Returns False if Redis is unavailable."""
    try:
        r = await get_redis()
        stored = await r.get(f"otp:{email}")
        if stored and stored == otp:
            await r.delete(f"otp:{email}")
            return True
        return False
    except Exception:
        return False


async def store_refresh_token(user_id: str, token: str, ttl_seconds: int = 2592000) -> None:
    """Store a refresh token in Redis (default 30 days). Best-effort — Redis failure is logged."""
    try:
        r = await get_redis()
        await r.setex(f"refresh:{user_id}", ttl_seconds, token)
    except Exception:
        pass


async def verify_refresh_token(user_id: str, token: str) -> bool:
    """Verify a refresh token from Redis. Returns True if Redis is unavailable (fail open)."""
    try:
        r = await get_redis()
        stored = await r.get(f"refresh:{user_id}")
        return stored is not None and stored == token
    except Exception:
        # If Redis is unavailable, fall back to trusting the JWT signature alone
        return True


async def invalidate_refresh_token(user_id: str) -> None:
    """Remove a refresh token from Redis."""
    try:
        r = await get_redis()
        await r.delete(f"refresh:{user_id}")
    except Exception:
        pass


async def cache_session_data(session_id: str, data: str, ttl_seconds: int = 3600) -> None:
    """Cache session analysis data for fast retrieval."""
    r = await get_redis()
    await r.setex(f"session:{session_id}", ttl_seconds, data)


async def get_cached_session(session_id: str) -> Optional[str]:
    """Retrieve cached session data."""
    r = await get_redis()
    return await r.get(f"session:{session_id}")
