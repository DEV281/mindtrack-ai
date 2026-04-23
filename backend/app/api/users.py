"""User profile management API routes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import hash_password, validate_password_strength, verify_password
from app.db.models import User
from app.api.auth import get_current_user
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class ProfileUpdateRequest(BaseModel):
    """Update user profile fields."""
    name: Optional[str] = None
    institution: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    """Change password request."""
    current_password: str
    new_password: str = Field(..., min_length=8)


class OnboardingProfileRequest(BaseModel):
    """Onboarding profile update — all fields optional."""
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    concerns: Optional[List[str]] = None
    wellness_baseline: Optional[int] = None
    sleep_quality: Optional[str] = None
    anxious_time: Optional[str] = None
    preferred_name: Optional[str] = None
    profile_photo_url: Optional[str] = None
    preferred_language: Optional[str] = None
    onboarding_completed: Optional[bool] = None
    onboarding_skipped: Optional[bool] = None
    notification_daily: Optional[bool] = None
    notification_weekly: Optional[bool] = None
    notification_sessions: Optional[bool] = None


class OnboardingProfileResponse(BaseModel):
    """Full user profile response including onboarding fields."""
    id: str
    email: str
    name: str
    institution: Optional[str] = None
    role: str
    is_verified: bool
    created_at: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    concerns: Optional[List[str]] = None
    wellness_baseline: Optional[int] = None
    sleep_quality: Optional[str] = None
    anxious_time: Optional[str] = None
    preferred_name: Optional[str] = None
    profile_photo_url: Optional[str] = None
    preferred_language: Optional[str] = None
    onboarding_completed: bool = False
    onboarding_skipped: bool = False
    notification_daily: bool = True
    notification_weekly: bool = True
    notification_sessions: bool = False
    tnc_accepted: bool = False
    complexity_profile: Optional[str] = None
    complexity_score: Optional[int] = None


class ComplexityAssessmentRequest(BaseModel):
    """Complexity assessment submission."""
    answers: List[int]  # 5 answers, each 1-3 (A=1, B=2, C=3, D=2)
    complexity_score: int
    complexity_profile: str  # analytical / reflective / exploratory


class TncAcceptRequest(BaseModel):
    """T&C acceptance."""
    accepted: bool = True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user_response(user: User) -> UserResponse:
    """Helper to build a UserResponse from a User model."""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        institution=user.institution,
        role=user.role,
        is_verified=user.is_verified,
        created_at=user.created_at.isoformat() if user.created_at else "",
    )


def _full_profile_response(user: User) -> OnboardingProfileResponse:
    """Build full profile response including onboarding fields."""
    return OnboardingProfileResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        institution=user.institution,
        role=user.role,
        is_verified=user.is_verified,
        created_at=user.created_at.isoformat() if user.created_at else "",
        date_of_birth=user.date_of_birth,
        gender=user.gender,
        occupation=user.occupation,
        concerns=user.concerns,
        wellness_baseline=user.wellness_baseline,
        sleep_quality=user.sleep_quality,
        anxious_time=user.anxious_time,
        preferred_name=user.preferred_name,
        profile_photo_url=user.profile_photo_url,
        preferred_language=user.preferred_language or "English",
        onboarding_completed=user.onboarding_completed or False,
        onboarding_skipped=user.onboarding_skipped or False,
        notification_daily=user.notification_daily if user.notification_daily is not None else True,
        notification_weekly=user.notification_weekly if user.notification_weekly is not None else True,
        notification_sessions=user.notification_sessions or False,
        tnc_accepted=user.tnc_accepted or False,
        complexity_profile=user.complexity_profile,
        complexity_score=user.complexity_score,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Get current user basic profile."""
    return _user_response(current_user)


@router.get("/me/profile", response_model=OnboardingProfileResponse)
@router.get("/profile", response_model=OnboardingProfileResponse)
async def get_full_profile(current_user: User = Depends(get_current_user)) -> OnboardingProfileResponse:
    """Get full user profile including onboarding fields."""
    return _full_profile_response(current_user)


@router.put("/me", response_model=UserResponse)
@router.put("/profile", response_model=UserResponse)
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update user profile fields."""
    if body.name is not None:
        current_user.name = body.name
    if body.institution is not None:
        current_user.institution = body.institution
    await db.flush()
    return _user_response(current_user)


@router.patch("/me/profile", response_model=OnboardingProfileResponse)
async def update_onboarding_profile(
    body: OnboardingProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OnboardingProfileResponse:
    """Update onboarding profile fields (partial update)."""
    update_fields = body.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        if hasattr(current_user, field):
            setattr(current_user, field, value)
    await db.flush()
    return _full_profile_response(current_user)


@router.post("/me/complexity")
async def save_complexity_assessment(
    body: ComplexityAssessmentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Save complexity assessment results."""
    current_user.complexity_score = body.complexity_score
    current_user.complexity_profile = body.complexity_profile
    current_user.complexity_completed_at = datetime.now(timezone.utc)
    await db.flush()
    return {
        "message": "Complexity assessment saved",
        "complexity_profile": body.complexity_profile,
        "complexity_score": body.complexity_score,
    }


@router.post("/me/tnc-accept")
async def accept_tnc(
    body: TncAcceptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Record T&C acceptance."""
    current_user.tnc_accepted = body.accepted
    current_user.tnc_accepted_at = datetime.now(timezone.utc) if body.accepted else None
    await db.flush()
    return {"message": "Terms & Conditions accepted", "accepted": body.accepted}


@router.put("/me/password")
@router.post("/change-password")
async def change_password(
    body: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Change the current user's password."""
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change password for OAuth-only accounts",
        )
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    is_valid, issues = validate_password_strength(body.new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="; ".join(issues))
    current_user.hashed_password = hash_password(body.new_password)
    await db.flush()
    return {"message": "Password changed successfully"}


@router.delete("/account")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete the current user's account and all associated data."""
    await db.delete(current_user)
    await db.flush()
    return {"message": "Account deleted successfully"}
