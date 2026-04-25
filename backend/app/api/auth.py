"""Authentication API routes: register, login, OTP, OAuth, token refresh."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis_client import store_otp, verify_otp, store_refresh_token, invalidate_refresh_token, verify_refresh_token
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.db.models import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    OTPVerifyRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    """Extract and validate the current user from the Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid token")

    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    """Register a new user. Sends OTP to email for verification."""
    # Validate password strength
    is_valid, issues = validate_password_strength(body.password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(issues))

    # Check for existing user
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()
    if existing and existing.is_verified:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # If unverified user exists, remove it first
    if existing and not existing.is_verified:
        await db.delete(existing)
        await db.flush()

    # Create unverified user
    user = User(
        email=body.email,
        name=body.name,
        institution=body.institution,
        hashed_password=hash_password(body.password),
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    # Generate and store OTP (best-effort — Redis failure won't block registration)
    otp = generate_otp()
    try:
        await store_otp(body.email, otp)
    except Exception as e:
        logger.warning(f"Redis unavailable — OTP not cached for {body.email}: {e}")

    # Always print OTP in DEBUG mode (dev without email / Redis works fine)
    if settings.DEBUG:
        logger.info(f"[DEV] OTP for {body.email}: {otp}")

    # Send OTP via email
    email_sent = False
    try:
        await _send_otp_email(body.email, otp)
        email_sent = True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {body.email}: {e}", exc_info=True)

    return AuthResponse(
        message="Registration successful. Please verify your email with the OTP sent." if email_sent
               else "Registration successful. OTP email could not be sent — please use Resend Code.",
        email=body.email,
        requires_otp=True,
        email_sent=email_sent,
    )


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_endpoint(body: OTPVerifyRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Verify OTP and activate user account. Returns JWT tokens."""
    is_valid = await verify_otp(body.email, body.otp)

    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_verified = True
    await db.commit()

    access_token = create_access_token({"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id})
    await store_refresh_token(user.id, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
    )


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email/password. Generates 2FA OTP (skipped for demo user)."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not verified. Please check your email for OTP.")

    # Skip OTP for demo user — return tokens directly
    if body.email == settings.DEMO_EMAIL:
        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token({"sub": user.id})
        await store_refresh_token(user.id, refresh_token)
        logger.info(f"Demo user logged in directly (OTP skipped)")
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
        )

    # Generate OTP for 2FA (regular users)
    otp = generate_otp()
    try:
        await store_otp(body.email, otp)
    except Exception as e:
        logger.warning(f"Redis unavailable — login OTP not cached for {body.email}: {e}")

    if settings.DEBUG:
        logger.info(f"[DEV] Login OTP for {body.email}: {otp}")

    try:
        await _send_otp_email(body.email, otp)
    except Exception as e:
        logger.error(f"Failed to send login OTP email to {body.email}: {e}", exc_info=True)
        return AuthResponse(message="OTP generated but email could not be sent. Please use Resend Code.", email=body.email, requires_otp=True, email_sent=False)

    return AuthResponse(message="OTP sent to your email", email=body.email, requires_otp=True)


from pydantic import BaseModel as _BaseModel


class _ResendOtpBody(_BaseModel):
    email: str


@router.post("/resend-otp")
async def resend_otp(body: _ResendOtpBody) -> dict:
    """Resend OTP — generates and emails a fresh verification code."""
    otp = generate_otp()
    try:
        await store_otp(body.email, otp)
    except Exception as e:
        logger.warning(f"Redis unavailable during resend: {e}")
    if settings.DEBUG:
        logger.info(f"[DEV] Resend OTP for {body.email}: {otp}")
    email_sent = False
    try:
        await _send_otp_email(body.email, otp)
        email_sent = True
    except Exception as e:
        logger.error(f"Failed to resend OTP to {body.email}: {e}")
    return {
        "message": "OTP resent" if email_sent else "OTP generated but email failed to send. Check SMTP configuration.",
        "email": body.email,
        "email_sent": email_sent,
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Refresh JWT access token using a valid refresh token."""
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    is_valid = await verify_refresh_token(user_id, body.refresh_token)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked or expired")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    new_access = create_access_token({"sub": user.id, "email": user.email})
    new_refresh = create_refresh_token({"sub": user.id})
    await store_refresh_token(user.id, new_refresh)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
    )


@router.post("/logout")
async def logout(request: Request) -> dict:
    """Logout by invalidating the refresh token."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        if payload and payload.get("sub"):
            await invalidate_refresh_token(payload["sub"])
    return {"message": "Logged out successfully"}


# ── Forgot / Reset Password ────────────────────────────────────────────────────

class _ForgotPasswordBody(_BaseModel):
    email: str


class _VerifyResetOtpBody(_BaseModel):
    email: str
    otp: str


class _ResetPasswordBody(_BaseModel):
    email: str
    otp: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(body: _ForgotPasswordBody, db: AsyncSession = Depends(get_db)) -> dict:
    """Send a password-reset OTP to the user's email (if the account exists)."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Always return success to avoid email enumeration attacks
    if user is None:
        return {"message": "If that email is registered, you will receive a reset code."}

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is not verified. Please complete email verification first.",
        )

    otp = generate_otp()
    try:
        # Store under a separate namespace so it can't be used as a login/register OTP
        r = await _get_redis_client()
        await r.setex(f"reset_otp:{body.email}", 600, otp)
    except Exception as e:
        logger.warning(f"Redis unavailable — reset OTP not cached for {body.email}: {e}")

    if settings.DEBUG:
        logger.info(f"[DEV] Password-reset OTP for {body.email}: {otp}")

    try:
        await _send_reset_email(body.email, otp)
    except Exception as e:
        logger.error(f"Failed to send reset OTP email to {body.email}: {e}", exc_info=True)

    return {"message": "If that email is registered, you will receive a reset code."}


@router.post("/verify-reset-otp")
async def verify_reset_otp(body: _VerifyResetOtpBody) -> dict:
    """Verify a password-reset OTP (does NOT mark it consumed — reset-password does that)."""
    try:
        r = await _get_redis_client()
        stored = await r.get(f"reset_otp:{body.email}")
        if not stored or stored != body.otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Verification service unavailable")

    return {"message": "Code verified. You may now set your new password."}


@router.post("/reset-password")
async def reset_password(body: _ResetPasswordBody, db: AsyncSession = Depends(get_db)) -> dict:
    """Verify OTP and set a new password for the user."""
    # Validate password strength first
    is_valid, issues = validate_password_strength(body.new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(issues))

    # Verify OTP
    try:
        r = await _get_redis_client()
        stored = await r.get(f"reset_otp:{body.email}")
        if not stored or stored != body.otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code")
        # Consume the OTP
        await r.delete(f"reset_otp:{body.email}")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Reset service unavailable")

    # Update password
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = hash_password(body.new_password)
    await db.flush()

    # Invalidate all existing refresh tokens (force re-login)
    await invalidate_refresh_token(user.id)

    logger.info(f"Password reset successfully for {body.email}")
    return {"message": "Password reset successfully. Please log in with your new password."}


async def _get_redis_client():
    """Internal helper to get the Redis client for password reset OTPs."""
    from app.core.redis_client import get_redis
    return await get_redis()




@router.get("/google")
async def google_auth() -> dict:
    """Return Google OAuth2 authorization URL."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth not configured")

    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid email profile&"
        f"access_type=offline"
    )
    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Handle Google OAuth2 callback. Creates or logs in user."""
    import httpx

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth not configured")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to exchange Google auth code")

    google_data = token_resp.json()
    id_token = google_data.get("id_token", "")

    # Decode the ID token to get user info
    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {google_data['access_token']}"},
        )

    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to get Google user info")

    google_user = userinfo_resp.json()
    google_id = google_user.get("sub")
    email = google_user.get("email")
    name = google_user.get("name", email)

    # Find or create user
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user is None:
        # Check if email already exists
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            # Link Google account to existing user
            user.google_id = google_id
            user.is_verified = True
        else:
            # Create new user
            user = User(
                email=email,
                name=name,
                google_id=google_id,
                is_verified=True,
            )
            db.add(user)

    await db.flush()

    access_token = create_access_token({"sub": user.id, "email": user.email})
    refresh_token = create_refresh_token({"sub": user.id})
    await store_refresh_token(user.id, refresh_token)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Get current authenticated user profile."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        institution=current_user.institution,
        role=current_user.role,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
    )


async def _send_otp_email(email: str, otp: str) -> None:
    """Send OTP via email — uses Resend API (HTTPS) if configured, else SMTP."""
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #6C63FF; margin-bottom: 8px;">MindTrack AI</h2>
        <p>Your verification code is:</p>
        <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">{otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">If you did not request this code, please ignore this email.</p>
    </div>
    """
    plain_body = (
        f"Your MindTrack AI verification code is: {otp}\n\n"
        f"This code expires in 10 minutes.\n\n"
        f"If you did not request this code, please ignore this email."
    )
    await _send_email(
        to=email,
        subject="MindTrack AI — Your Verification Code",
        html=html_body,
        plain=plain_body,
    )


async def _send_reset_email(email: str, otp: str) -> None:
    """Send a password-reset OTP email."""
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #6C63FF; margin-bottom: 8px;">MindTrack AI</h2>
        <p>You requested a password reset. Your reset code is:</p>
        <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">{otp}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">If you did not request a password reset, please ignore this email. Your password will not change.</p>
    </div>
    """
    plain_body = (
        f"Your MindTrack AI password reset code is: {otp}\n\n"
        f"This code expires in 10 minutes.\n\n"
        f"If you did not request a password reset, please ignore this email."
    )
    await _send_email(
        to=email,
        subject="MindTrack AI — Password Reset Code",
        html=html_body,
        plain=plain_body,
    )


async def _send_email(*, to: str, subject: str, html: str, plain: str) -> None:
    """Send an email via Resend API (HTTPS) or SMTP fallback."""
    import os
    resend_key = os.environ.get("RESEND_API_KEY")

    if resend_key:
        # --- Resend API (works on Railway — HTTPS, no SMTP ports needed) ---
        import httpx
        from_addr = os.environ.get("RESEND_FROM", "MindTrack AI <onboarding@resend.dev>")
        logger.info(f"Sending email to {to} via Resend API")
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {resend_key}"},
                json={
                    "from": from_addr,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                    "text": plain,
                },
            )
            if resp.status_code not in (200, 201):
                logger.error(f"Resend API error: {resp.status_code} {resp.text}")
                raise RuntimeError(f"Resend API error: {resp.status_code} {resp.text}")
        logger.info(f"Email sent successfully to {to} via Resend")
        return

    # --- SMTP fallback (for local development) ---
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise RuntimeError("No email provider configured. Set RESEND_API_KEY or SMTP_USER/SMTP_PASSWORD.")

    import aiosmtplib
    import ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    try:
        import certifi
        tls_context = ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        tls_context = ssl.create_default_context()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_USER
    msg["To"] = to
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    port = int(settings.SMTP_PORT)
    use_ssl = port == 465
    logger.info(f"Sending email to {to} via SMTP {settings.SMTP_HOST}:{port}")

    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=port,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        use_tls=use_ssl,
        start_tls=not use_ssl,
        tls_context=tls_context,
        timeout=30,
    )
    logger.info(f"Email sent successfully to {to} via SMTP")

