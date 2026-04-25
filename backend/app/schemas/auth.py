"""Pydantic schemas for authentication endpoints."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Registration request body."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=255)
    institution: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str


class OTPVerifyRequest(BaseModel):
    """OTP verification request body."""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


class RefreshTokenRequest(BaseModel):
    """Refresh token request body."""
    refresh_token: str


class AuthResponse(BaseModel):
    """Standard auth response."""
    message: str
    email: Optional[str] = None
    requires_otp: bool = False
    email_sent: bool = True
    debug_otp: Optional[str] = None  # Only populated when DEBUG=true and email fails


class TokenResponse(BaseModel):
    """JWT token pair response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str
    role: str


class UserResponse(BaseModel):
    """User profile response."""
    id: str
    email: str
    name: str
    institution: Optional[str] = None
    role: str
    is_verified: bool
    created_at: str


class PasswordResetRequest(BaseModel):
    """Password reset request."""
    email: EmailStr


class GoogleAuthResponse(BaseModel):
    """Google OAuth callback response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str
