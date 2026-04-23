"""Session management API routes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.db.models import User, Session as SessionModel, AnalysisReading
from app.api.auth import get_current_user
from app.schemas.session import (
    SessionCreate,
    SessionListResponse,
    SessionResponse,
    SessionStopResponse,
    SessionUpdate,
)

router = APIRouter(prefix="/sessions", tags=["Sessions"])


def _session_to_response(session: SessionModel) -> SessionResponse:
    """Convert ORM session to response schema."""
    return SessionResponse(
        id=session.id,
        session_id=session.id,
        user_id=session.user_id,
        started_at=session.started_at.isoformat() if session.started_at else "",
        ended_at=session.ended_at.isoformat() if session.ended_at else None,
        duration_seconds=session.duration_seconds,
        model_rank=session.model_rank,
        total_readings=session.total_readings,
        final_risk_score=session.final_risk_score,
        notes=session.notes,
    )


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/start", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    body: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Start a new analysis session."""
    session = SessionModel(
        user_id=current_user.id,
        model_rank=body.model_rank,
        notes=body.notes,
    )
    db.add(session)
    await db.flush()
    resp = _session_to_response(session)
    return resp


@router.post("/{session_id}/stop", response_model=SessionStopResponse)
async def stop_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionStopResponse:
    """Stop a running session and compute final metrics."""
    result = await db.execute(
        select(SessionModel).where(
            SessionModel.id == session_id,
            SessionModel.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.ended_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session already ended")

    session.ended_at = datetime.now(timezone.utc)
    if session.started_at:
        session.duration_seconds = int((session.ended_at - session.started_at).total_seconds())

    # Compute final risk score from readings
    readings_result = await db.execute(
        select(func.avg(AnalysisReading.overall_risk), func.count(AnalysisReading.id)).where(
            AnalysisReading.session_id == session_id
        )
    )
    row = readings_result.one()
    avg_risk = row[0] or 0.0
    total = row[1] or 0

    session.final_risk_score = round(float(avg_risk), 2)
    session.total_readings = total
    await db.flush()

    return SessionStopResponse(
        session_id=session.id,
        duration_seconds=session.duration_seconds or 0,
        total_readings=total,
        final_risk_score=session.final_risk_score,
        message="Session stopped successfully",
    )


@router.get("/", response_model=SessionListResponse)
async def list_sessions(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionListResponse:
    """List all sessions for the current user, most recent first."""
    offset = (page - 1) * page_size

    # Count total
    count_result = await db.execute(
        select(func.count(SessionModel.id)).where(SessionModel.user_id == current_user.id)
    )
    total = count_result.scalar() or 0

    # Fetch page
    result = await db.execute(
        select(SessionModel)
        .where(SessionModel.user_id == current_user.id)
        .order_by(desc(SessionModel.started_at))
        .offset(offset)
        .limit(page_size)
    )
    sessions = result.scalars().all()

    return SessionListResponse(
        sessions=[_session_to_response(s) for s in sessions],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Get a specific session by ID."""
    result = await db.execute(
        select(SessionModel).where(
            SessionModel.id == session_id,
            SessionModel.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return _session_to_response(session)


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    body: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionResponse:
    """Update session notes or model rank."""
    result = await db.execute(
        select(SessionModel).where(
            SessionModel.id == session_id,
            SessionModel.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if body.notes is not None:
        session.notes = body.notes
    if body.model_rank is not None:
        session.model_rank = body.model_rank

    await db.flush()
    return _session_to_response(session)


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a session and all associated data."""
    result = await db.execute(
        select(SessionModel).where(
            SessionModel.id == session_id,
            SessionModel.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    await db.delete(session)
    await db.flush()
    return {"message": "Session deleted successfully"}
