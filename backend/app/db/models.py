"""SQLAlchemy ORM models for the MindTrack AI database."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow() -> datetime:
    """Return timezone-aware UTC now."""
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    """Generate a new UUID4 string."""
    return str(uuid.uuid4())


class User(Base):
    """Application user."""

    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    institution = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="researcher")
    hashed_password = Column(String(255), nullable=True)
    google_id = Column(String(255), unique=True, nullable=True)
    is_verified = Column(Boolean, default=False)
    preferred_model_rank = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # --- Terms & Conditions (Change #4) ---
    tnc_accepted = Column(Boolean, default=False)
    tnc_accepted_at = Column(DateTime(timezone=True), nullable=True)

    # --- Personal Details / Onboarding (Change #5) ---
    date_of_birth = Column(String(20), nullable=True)
    gender = Column(String(30), nullable=True)
    occupation = Column(String(100), nullable=True)
    concerns = Column(JSON, nullable=True)  # JSON array of concern tags
    wellness_baseline = Column(Integer, nullable=True)  # 1-5
    sleep_quality = Column(String(20), nullable=True)
    anxious_time = Column(String(30), nullable=True)
    preferred_name = Column(String(100), nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    preferred_language = Column(String(30), default="English")
    onboarding_completed = Column(Boolean, default=False)
    onboarding_skipped = Column(Boolean, default=False)
    notification_daily = Column(Boolean, default=True)
    notification_weekly = Column(Boolean, default=True)
    notification_sessions = Column(Boolean, default=False)

    # --- Complexity Assessment (Change #7) ---
    complexity_profile = Column(String(20), nullable=True)  # analytical / reflective / exploratory
    complexity_score = Column(Integer, nullable=True)  # 5-15
    complexity_completed_at = Column(DateTime(timezone=True), nullable=True)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    consultations = relationship("Consultation", back_populates="user", cascade="all, delete-orphan")
    activity_mood_logs = relationship("ActivityMoodLog", back_populates="user", cascade="all, delete-orphan")
    gratitude_entries = relationship("GratitudeEntry", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    """Analysis session."""

    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=utcnow)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    model_rank = Column(Integer, default=1)
    total_readings = Column(Integer, default=0)
    final_risk_score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="sessions")
    readings = relationship("AnalysisReading", back_populates="session", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="session", cascade="all, delete-orphan")


class AnalysisReading(Base):
    """Individual analysis reading within a session."""

    __tablename__ = "analysis_readings"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow)
    stress = Column(Float, default=0.0)
    anxiety = Column(Float, default=0.0)
    stability = Column(Float, default=0.0)
    depression_risk = Column(Float, default=0.0)
    overall_risk = Column(Float, default=0.0)
    emotions_json = Column(JSON, nullable=True)
    voice_freq = Column(Float, nullable=True)
    voice_amplitude = Column(Float, nullable=True)
    confidence = Column(Float, default=0.0)
    alerts_json = Column(JSON, nullable=True)

    session = relationship("Session", back_populates="readings")


class Report(Base):
    """Generated session report."""

    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    consultation_id = Column(String, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_at = Column(DateTime(timezone=True), default=utcnow)
    summary_text = Column(Text, nullable=True)
    peak_stress = Column(Float, nullable=True)
    avg_stress = Column(Float, nullable=True)
    recommendations_json = Column(JSON, nullable=True)

    session = relationship("Session", back_populates="reports")
    consultation = relationship("Consultation", back_populates="reports")
    user = relationship("User", back_populates="reports")


# ---------------------------------------------------------------------------
# Consultation system models
# ---------------------------------------------------------------------------


class Consultation(Base):
    """One-on-one patient consultation session."""

    __tablename__ = "consultations"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=utcnow)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    model_rank = Column(Integer, default=1)
    mode = Column(String(20), default="live")  # live / assessment / free
    status = Column(String(20), default="active")  # active / completed
    final_risk_score = Column(Float, nullable=True)
    summary_text = Column(Text, nullable=True)

    user = relationship("User", back_populates="consultations")
    messages = relationship("ConsultationMessage", back_populates="consultation", cascade="all, delete-orphan")
    assessment_results = relationship("AssessmentResult", back_populates="consultation", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="consultation", cascade="all, delete-orphan")


class ConsultationMessage(Base):
    """Individual message in a consultation conversation."""

    __tablename__ = "consultation_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String(20), nullable=False)  # "ai" or "patient"
    message_text = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utcnow)
    stress_at_message = Column(Float, nullable=True)
    anxiety_at_message = Column(Float, nullable=True)
    emotions_json = Column(JSON, nullable=True)
    is_assessment_question = Column(Boolean, default=False)
    assessment_q_index = Column(Integer, nullable=True)
    assessment_answer = Column(Integer, nullable=True)
    voice_transcript = Column(Text, nullable=True)
    input_method = Column(String(10), default="text")  # 'text' or 'voice'
    image_url = Column(String(500), nullable=True)  # Change #8
    camera_snapshot = Column(JSON, nullable=True)  # Camera data at time of message

    consultation = relationship("Consultation", back_populates="messages")


class AssessmentResult(Base):
    """PHQ-9 + GAD-7 structured assessment result."""

    __tablename__ = "assessment_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    consultation_id = Column(String, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False, index=True)
    phq9_score = Column(Integer, default=0)
    gad7_score = Column(Integer, default=0)
    phq9_level = Column(String(50), nullable=True)
    gad7_level = Column(String(50), nullable=True)
    q9_positive = Column(Boolean, default=False)
    q17_positive = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), default=utcnow)
    recommendations_json = Column(JSON, nullable=True)

    consultation = relationship("Consultation", back_populates="assessment_results")


# ---------------------------------------------------------------------------
# Activities models (Change #6)
# ---------------------------------------------------------------------------


class ActivityMoodLog(Base):
    """Mood tracking after completing an activity."""

    __tablename__ = "activity_mood_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False)  # breathing, memory, gratitude, wordcalm, jigsaw, music
    before_mood = Column(Integer, nullable=True)  # 1-4
    after_mood = Column(Integer, nullable=True)  # 1-4
    duration_seconds = Column(Integer, nullable=True)
    completed_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="activity_mood_logs")


class GratitudeEntry(Base):
    """Individual gratitude jar entry."""

    __tablename__ = "gratitude_entries"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="gratitude_entries")
