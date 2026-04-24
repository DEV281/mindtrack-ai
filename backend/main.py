"""MindTrack AI v4 — FastAPI main application entry point."""

from __future__ import annotations

import logging
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.core.database import init_db, close_db
from app.core.redis_client import get_redis, close_redis
from app.core.security import hash_password
from app.api import auth, users, sessions, analysis, reports, consultation
from app.api.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("Starting MindTrack AI v4...")

    # Initialize database tables
    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.warning(f"Database init warning (will retry on first request): {e}")

    # Initialize Redis
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis connection warning: {e}")

    # Seed demo user
    try:
        await _seed_demo_user()
    except Exception as e:
        logger.warning(f"Demo user seeding skipped: {e}")

    logger.info("MindTrack AI v4 ready!")
    logger.info(f"  Frontend: {settings.FRONTEND_URL}")
    logger.info(f"  API Docs: http://localhost:8000/docs")
    logger.info(f"  Demo Login: {settings.DEMO_EMAIL} / {settings.DEMO_PASSWORD}")

    yield

    # Shutdown
    logger.info("Shutting down MindTrack AI v4...")
    await close_db()
    await close_redis()


app = FastAPI(
    title="MindTrack AI",
    version="4.0.0",
    description="AI-Powered Mental Health Stress Detection Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow localhost, ngrok, and Vercel production domains
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:80",
    "https://mindtrack-ai.vercel.app",
    os.environ.get("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in allowed_origins if o],
    allow_origin_regex=r"(http://localhost(:\d+)?|https://.*\.vercel\.app|https://.*\.ngrok-free\.app|https://.*\.ngrok\.io)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(consultation.router, prefix="/api")
app.include_router(analysis.router)


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint for Railway and monitoring."""
    return {
        "status": "healthy",
        "version": "4.0.0",
        "service": "MindTrack AI",
        "groq": "configured" if os.environ.get("GROQ_API_KEY") else "missing",
        "db": "configured" if os.environ.get("DATABASE_URL") else "missing",
        "smtp": "configured" if (os.environ.get("SMTP_USER") and os.environ.get("SMTP_PASSWORD")) else "missing",
        "redis": "configured" if os.environ.get("REDIS_URL") else "default",
    }


@app.get("/api/stats")
async def get_stats(current_user=Depends(get_current_user)) -> dict:
    """Return user-scoped statistics for the dashboard."""
    from sqlalchemy import select, func
    from app.core.database import async_session_factory
    from app.db.models import Session as SessionModel, AnalysisReading, Consultation

    try:
        uid = current_user.id
        async with async_session_factory() as db:
            session_count = (await db.execute(
                select(func.count(SessionModel.id)).where(SessionModel.user_id == uid)
            )).scalar() or 0
            reading_count = (await db.execute(
                select(func.count(AnalysisReading.id)).where(AnalysisReading.session_id.in_(
                    select(SessionModel.id).where(SessionModel.user_id == uid)
                ))
            )).scalar() or 0
            avg_risk = (await db.execute(
                select(func.avg(SessionModel.final_risk_score)).where(SessionModel.user_id == uid)
            )).scalar() or 0
            high_risk_count = (await db.execute(
                select(func.count(SessionModel.id)).where(
                    SessionModel.user_id == uid,
                    SessionModel.final_risk_score > 70,
                )
            )).scalar() or 0
            consultation_count = (await db.execute(
                select(func.count(Consultation.id)).where(Consultation.user_id == uid)
            )).scalar() or 0

            # Calculate average session duration
            avg_duration = (await db.execute(
                select(func.avg(SessionModel.duration_seconds)).where(
                    SessionModel.user_id == uid,
                    SessionModel.duration_seconds.isnot(None),
                )
            )).scalar() or 0

        avg_dur_int = int(avg_duration)
        avg_dur_str = f"{avg_dur_int // 60}:{avg_dur_int % 60:02d}" if avg_dur_int > 0 else "—"

        return {
            "total_sessions": session_count + consultation_count,
            "total_readings": reading_count,
            "avg_risk_score": round(float(avg_risk), 1),
            "high_risk_sessions": high_risk_count,
            "total_consultations": consultation_count,
            "model_accuracy": 79.5,
            "active_users": 1,
            "avg_duration": avg_dur_str,
        }
    except Exception:
        return {
            "total_sessions": 0,
            "total_readings": 0,
            "avg_risk_score": 0,
            "high_risk_sessions": 0,
            "total_consultations": 0,
            "model_accuracy": 79.5,
            "active_users": 0,
            "avg_duration": "—",
        }


@app.get("/api/stats/recent-sessions")
async def get_recent_sessions(current_user=Depends(get_current_user)) -> dict:
    """Return the last 5 consultation sessions for the current user."""
    from sqlalchemy import select, func, desc
    from app.core.database import async_session_factory
    from app.db.models import Consultation, ConsultationMessage

    try:
        uid = current_user.id
        async with async_session_factory() as db:
            result = await db.execute(
                select(Consultation)
                .where(Consultation.user_id == uid)
                .order_by(desc(Consultation.started_at))
                .limit(5)
            )
            consultations = result.scalars().all()

            sessions = []
            for c in consultations:
                msg_count = (await db.execute(
                    select(func.count(ConsultationMessage.id)).where(
                        ConsultationMessage.consultation_id == c.id
                    )
                )).scalar() or 0

                avg_stress = (await db.execute(
                    select(func.avg(ConsultationMessage.stress_at_message)).where(
                        ConsultationMessage.consultation_id == c.id,
                        ConsultationMessage.stress_at_message.isnot(None),
                    )
                )).scalar()

                dur = c.duration_seconds or 0
                dur_str = f"{dur // 60:02d}:{dur % 60:02d}" if dur > 0 else "—"

                risk_val = c.final_risk_score or (avg_stress if avg_stress else 0)
                if risk_val < 40:
                    risk_label = "LOW"
                elif risk_val < 70:
                    risk_label = "MODERATE"
                else:
                    risk_label = "HIGH"

                rank_models = {
                    1: "ViT + CNN + Mamba",
                    2: "ViT + Raw Spec + S4",
                    3: "ConvNeXt + CNN + Mamba",
                }

                sessions.append({
                    "id": c.id,
                    "date": c.started_at.strftime("%Y-%m-%d %H:%M") if c.started_at else "—",
                    "duration": dur_str,
                    "avgStress": round(float(avg_stress), 1) if avg_stress else 0,
                    "risk": risk_label,
                    "model": rank_models.get(c.model_rank, "ViT + CNN + Mamba"),
                    "readings": msg_count,
                })

        return {"sessions": sessions}
    except Exception:
        return {"sessions": []}


@app.get("/api/stats/trend-data")
async def get_trend_data(current_user=Depends(get_current_user)) -> dict:
    """Return trend data (last 30 consultations) for the trend chart."""
    from sqlalchemy import select, func, desc
    from app.core.database import async_session_factory
    from app.db.models import Consultation, ConsultationMessage

    try:
        uid = current_user.id
        async with async_session_factory() as db:
            result = await db.execute(
                select(Consultation)
                .where(Consultation.user_id == uid, Consultation.status == "completed")
                .order_by(Consultation.started_at)
                .limit(30)
            )
            consultations = result.scalars().all()

            trend = []
            for i, c in enumerate(consultations):
                row = await db.execute(
                    select(
                        func.avg(ConsultationMessage.stress_at_message),
                        func.avg(ConsultationMessage.anxiety_at_message),
                    ).where(
                        ConsultationMessage.consultation_id == c.id,
                        ConsultationMessage.stress_at_message.isnot(None),
                    )
                )
                vals = row.one()
                stress = float(vals[0] or 0)
                anxiety = float(vals[1] or 0)
                stability = max(0, 100 - stress * 0.7)

                trend.append({
                    "session": f"S{i + 1}",
                    "stress": round(stress, 1),
                    "anxiety": round(anxiety, 1),
                    "stability": round(stability, 1),
                })

        return {"trend": trend}
    except Exception:
        return {"trend": []}


@app.get("/api/stats/comparison")
async def get_comparison_cards(current_user=Depends(get_current_user)) -> dict:
    """Return dynamic comparison cards based on user's last 2 consultations."""
    from sqlalchemy import select, func, desc
    from app.core.database import async_session_factory
    from app.db.models import Consultation, ConsultationMessage

    try:
        uid = current_user.id
        async with async_session_factory() as db:
            result = await db.execute(
                select(Consultation)
                .where(Consultation.user_id == uid, Consultation.status == "completed")
                .order_by(desc(Consultation.started_at))
                .limit(2)
            )
            consultations = result.scalars().all()

            if len(consultations) == 0:
                return {"cards": []}

            # Get stats for the most recent consultation
            latest = consultations[0]
            latest_stats = await db.execute(
                select(
                    func.avg(ConsultationMessage.stress_at_message),
                    func.count(ConsultationMessage.id),
                ).where(
                    ConsultationMessage.consultation_id == latest.id,
                    ConsultationMessage.stress_at_message.isnot(None),
                )
            )
            latest_row = latest_stats.one()
            latest_stress = float(latest_row[0] or 0)
            latest_msgs = int(latest_row[1] or 0)
            latest_dur = latest.duration_seconds or 0

            cards = []

            if len(consultations) >= 2:
                # Compare with previous session
                prev = consultations[1]
                prev_stats = await db.execute(
                    select(
                        func.avg(ConsultationMessage.stress_at_message),
                        func.count(ConsultationMessage.id),
                    ).where(
                        ConsultationMessage.consultation_id == prev.id,
                        ConsultationMessage.stress_at_message.isnot(None),
                    )
                )
                prev_row = prev_stats.one()
                prev_stress = float(prev_row[0] or 0)
                prev_msgs = int(prev_row[1] or 0)
                prev_dur = prev.duration_seconds or 0

                # Stress change
                stress_diff = prev_stress - latest_stress
                if stress_diff > 0:
                    cards.append({
                        "emoji": "😊",
                        "title": "Your stress dropped by",
                        "detail": f"{abs(stress_diff):.0f}% compared to your last session",
                        "label": "↑ Great improvement!",
                    })
                elif stress_diff < 0:
                    cards.append({
                        "emoji": "🫶",
                        "title": "Stress was a bit higher",
                        "detail": f"Up {abs(stress_diff):.0f}% from last time — that's okay",
                        "label": "→ Keep showing up",
                    })
                else:
                    cards.append({
                        "emoji": "🧘",
                        "title": "Your stress stayed steady",
                        "detail": f"Consistent at around {latest_stress:.0f}%",
                        "label": "→ Stability is progress",
                    })

                # Duration change
                dur_diff = latest_dur - prev_dur
                if dur_diff > 30:
                    cards.append({
                        "emoji": "⏱️",
                        "title": "You spent more time",
                        "detail": f"{dur_diff // 60}m {dur_diff % 60}s longer than your last session",
                        "label": "↑ Deeper engagement!",
                    })
                elif latest_dur > 0:
                    cards.append({
                        "emoji": "⏱️",
                        "title": f"Session lasted {latest_dur // 60}m {latest_dur % 60}s",
                        "detail": "Every minute counts for your wellness",
                        "label": "→ Time well spent",
                    })

                # Message engagement
                msg_diff = latest_msgs - prev_msgs
                if msg_diff > 0:
                    cards.append({
                        "emoji": "💬",
                        "title": "You opened up more",
                        "detail": f"{msg_diff} more messages than your last session — that takes courage",
                        "label": "↑ We're proud of you",
                    })
                elif latest_msgs > 0:
                    cards.append({
                        "emoji": "💬",
                        "title": f"You shared {latest_msgs} messages",
                        "detail": "Every thought you express matters",
                        "label": "→ Keep talking",
                    })
            else:
                # Only one session — show absolute stats
                wellness = max(0, 100 - latest_stress)
                cards.append({
                    "emoji": "🌟",
                    "title": "Your first session!",
                    "detail": f"Wellness score: {wellness:.0f}% — great start",
                    "label": "↑ First step taken!",
                })
                if latest_dur > 0:
                    cards.append({
                        "emoji": "⏱️",
                        "title": f"You spent {latest_dur // 60}m {latest_dur % 60}s",
                        "detail": "in your first consultation — well done!",
                        "label": "→ Time well invested",
                    })
                if latest_msgs > 0:
                    cards.append({
                        "emoji": "💬",
                        "title": f"You shared {latest_msgs} messages",
                        "detail": "Opening up is the hardest part — and you did it",
                        "label": "↑ Brave first step",
                    })

            # Always add an encouraging card
            total_count = await db.execute(
                select(func.count(Consultation.id)).where(
                    Consultation.user_id == uid, Consultation.status == "completed"
                )
            )
            total = total_count.scalar() or 0
            cards.append({
                "emoji": "🏆",
                "title": f"{total} session{'s' if total != 1 else ''} completed",
                "detail": "Consistency is the key to lasting wellness",
                "label": "↑ Keep the streak going!",
            })

        return {"cards": cards}
    except Exception:
        return {"cards": []}


# ---------------------------------------------------------------------------
# Activity Endpoints (Change #6)
# ---------------------------------------------------------------------------

class MoodLogRequest(BaseModel):
    activity_type: str
    before_mood: Optional[int] = None
    after_mood: Optional[int] = None
    duration_seconds: Optional[int] = None


class GratitudeRequest(BaseModel):
    text: str


@app.post("/api/activities/mood-log")
async def log_activity_mood(
    body: MoodLogRequest,
    current_user=Depends(get_current_user),
) -> dict:
    """Log mood before/after an activity."""
    from app.core.database import async_session_factory
    from app.db.models import ActivityMoodLog

    try:
        async with async_session_factory() as db:
            log = ActivityMoodLog(
                user_id=current_user.id,
                activity_type=body.activity_type,
                before_mood=body.before_mood,
                after_mood=body.after_mood,
                duration_seconds=body.duration_seconds,
            )
            db.add(log)
            await db.commit()
        return {"message": "Mood logged", "activity": body.activity_type}
    except Exception:
        return {"message": "Failed to log mood"}


@app.post("/api/activities/gratitude")
async def add_gratitude(
    body: GratitudeRequest,
    current_user=Depends(get_current_user),
) -> dict:
    """Add a gratitude entry."""
    from app.core.database import async_session_factory
    from app.db.models import GratitudeEntry

    try:
        async with async_session_factory() as db:
            entry = GratitudeEntry(
                user_id=current_user.id,
                text=body.text,
            )
            db.add(entry)
            await db.commit()
        return {"message": "Gratitude saved"}
    except Exception:
        return {"message": "Failed to save gratitude"}


@app.get("/api/activities/gratitude")
async def get_gratitude_entries(
    current_user=Depends(get_current_user),
) -> dict:
    """Get gratitude entries for the current user (last 30)."""
    from sqlalchemy import select, desc
    from app.core.database import async_session_factory
    from app.db.models import GratitudeEntry

    try:
        async with async_session_factory() as db:
            result = await db.execute(
                select(GratitudeEntry)
                .where(GratitudeEntry.user_id == current_user.id)
                .order_by(desc(GratitudeEntry.created_at))
                .limit(30)
            )
            entries = result.scalars().all()
            return {
                "entries": [
                    {
                        "id": e.id,
                        "text": e.text,
                        "date": e.created_at.strftime("%Y-%m-%d") if e.created_at else "",
                    }
                    for e in entries
                ]
            }
    except Exception:
        return {"entries": []}


async def _seed_demo_user() -> None:
    """Create the demo user if it doesn't exist."""
    from sqlalchemy import select
    from app.core.database import async_session_factory
    from app.db.models import User

    async with async_session_factory() as db:
        result = await db.execute(select(User).where(User.email == settings.DEMO_EMAIL))
        user = result.scalar_one_or_none()
        if user is None:
            demo = User(
                email=settings.DEMO_EMAIL,
                name="Demo Researcher",
                institution="MindTrack AI Research Lab",
                role="admin",
                hashed_password=hash_password(settings.DEMO_PASSWORD),
                is_verified=True,
                tnc_accepted=True,
                onboarding_completed=True,
            )
            db.add(demo)
            await db.commit()
            logger.info(f"Demo user created: {settings.DEMO_EMAIL}")
        else:
            logger.info(f"Demo user already exists: {settings.DEMO_EMAIL}")


# ── Serve built frontend (MUST be last — catch-all SPA route) ──
FRONTEND_DIST = Path(__file__).resolve().parent / "frontend" / "dist"
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        """Serve the SPA frontend. API/docs/health routes are handled above."""
        file_path = FRONTEND_DIST / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    logger.info("Frontend dist not found — run 'npm run build' in frontend/ to enable single-port mode")

