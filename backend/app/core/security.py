"""Security utilities: JWT tokens, password hashing, OTP generation."""

from __future__ import annotations

import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token with longer expiry."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token. Returns payload or None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP of the specified length."""
    return "".join(random.choices(string.digits, k=length))


def validate_password_strength(password: str) -> tuple[bool, list[str]]:
    """
    Validate password strength.
    Returns (is_valid, list_of_issues).
    Requirements: 8+ chars, one uppercase, one digit.
    """
    issues: list[str] = []
    if len(password) < 8:
        issues.append("Password must be at least 8 characters long")
    if not any(c.isupper() for c in password):
        issues.append("Password must contain at least one uppercase letter")
    if not any(c.isdigit() for c in password):
        issues.append("Password must contain at least one digit")
    return len(issues) == 0, issues
