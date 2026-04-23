"""Pydantic schemas for session management."""

from __future__ import annotations

from typing import Optional, List

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    """Create a new analysis session."""
    model_rank: int = Field(default=1, ge=1, le=11)
    notes: Optional[str] = None


class SessionUpdate(BaseModel):
    """Update session fields."""
    notes: Optional[str] = None
    model_rank: Optional[int] = None


class SessionResponse(BaseModel):
    """Session summary response."""
    id: str
    session_id: Optional[str] = None  # alias for frontend compatibility
    user_id: str
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: Optional[int] = None
    model_rank: int
    total_readings: int
    final_risk_score: Optional[float] = None
    notes: Optional[str] = None


class SessionListResponse(BaseModel):
    """Paginated list of sessions."""
    sessions: List[SessionResponse]
    total: int
    page: int
    page_size: int


class SessionStopRequest(BaseModel):
    """Stop a running session."""
    session_id: str


class SessionStopResponse(BaseModel):
    """Response after stopping a session."""
    session_id: str
    duration_seconds: int
    total_readings: int
    final_risk_score: float
    message: str
