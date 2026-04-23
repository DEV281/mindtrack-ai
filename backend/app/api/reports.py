"""Reports API routes — generate, list, get session reports with wellness-focused data."""

from __future__ import annotations

import io
import logging
from datetime import timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.db.models import (
    User,
    Session as SessionModel,
    AnalysisReading,
    Report,
    Consultation,
    ConsultationMessage,
    AssessmentResult,
)
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mood_from_risk(avg_risk: float) -> dict:
    """Return emoji + label based on average risk score."""
    if avg_risk < 30:
        return {"emoji": "😌", "label": "Calm"}
    elif avg_risk < 50:
        return {"emoji": "😐", "label": "Neutral"}
    elif avg_risk < 70:
        return {"emoji": "😟", "label": "Tense"}
    else:
        return {"emoji": "😔", "label": "Heavy"}


def _mode_label(rank: int) -> dict:
    """Return emoji + label for analysis mode."""
    modes = {
        1: {"emoji": "✨", "label": "Best"},
        2: {"emoji": "⚡", "label": "Better"},
        3: {"emoji": "🌿", "label": "Good"},
    }
    return modes.get(rank, modes[1])


def _friendly_level(avg_risk: float) -> str:
    if avg_risk < 30:
        return "Minimal"
    elif avg_risk < 50:
        return "Mild"
    elif avg_risk < 70:
        return "Moderate"
    else:
        return "Significant"


def _build_observations(avg_risk: float, peak_risk: float, total_readings: int, duration_min: int) -> List[str]:
    """Generate positive observations from session data."""
    obs: List[str] = []
    wellness = 100 - avg_risk

    if wellness >= 70:
        obs.append(f"Your overall wellness was strong at {wellness:.0f}% — well done!")
    elif wellness >= 50:
        obs.append(f"Your wellness averaged {wellness:.0f}% — a solid session.")
    else:
        obs.append(f"Your wellness was at {wellness:.0f}% — you showed up and that matters.")

    if peak_risk < 50:
        obs.append("You stayed relatively calm throughout the session.")
    elif peak_risk < 70:
        obs.append("There were some moments of intensity, but you navigated them well.")
    else:
        obs.append("You experienced some challenging moments but stayed with the process.")

    if total_readings > 10:
        obs.append(f"We gathered {total_readings} data points for a thorough picture.")
    elif total_readings > 0:
        obs.append(f"We gathered {total_readings} data points during your session.")

    if duration_min > 5:
        obs.append(f"You dedicated {duration_min} minutes to your wellness — that takes commitment.")
    elif duration_min > 0:
        obs.append(f"Even {duration_min} minutes of checking in makes a difference.")

    if avg_risk < peak_risk - 20:
        obs.append("Your average was much calmer than your peak — you recovered well from tense moments.")

    return obs[:5]


def _build_recommendations(avg_risk: float, peak_risk: float, has_assessment: bool) -> List[str]:
    """Generate friendly recommendations based on data."""
    recs: List[str] = []

    if avg_risk < 30:
        recs.append("Keep up your current routines — they're clearly working for you 🌟")
        recs.append("Try the Breathing Bubble activity to maintain your calm energy")
    elif avg_risk < 50:
        recs.append("A daily 5-minute breathing exercise could help lower your baseline")
        recs.append("Try journaling before bed to process the day's events")
        recs.append("The Gratitude Jar activity is great for shifting perspective")
    elif avg_risk < 70:
        recs.append("Consider setting aside 10 minutes daily for mindfulness or deep breathing")
        recs.append("Talking to someone you trust about how you're feeling can make a big difference")
        recs.append("Try the Word Calm puzzle to give your mind a gentle break")
        recs.append("Regular physical activity — even a short walk — can help reduce tension")
    else:
        recs.append("You're carrying a lot right now. Please be gentle with yourself 💜")
        recs.append("Consider reaching out to a mental health professional — they can provide personalized support")
        recs.append("Try the Breathing Bubble activity right now for immediate relief")
        recs.append("Prioritize sleep, water, and one small act of self-care today")

    if peak_risk > 80:
        recs.append("When intensity peaks like today, grounding exercises (5-4-3-2-1) can help in the moment")

    if not has_assessment:
        recs.append("Complete a wellness check-in next time for a more complete picture of your wellbeing")

    return recs[:4]


# ---------------------------------------------------------------------------
# GET /reports — List all sessions with report data
# ---------------------------------------------------------------------------

@router.get("/")
async def list_reports(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all completed sessions/consultations with wellness metrics.
    
    Returns sessions + consultations merged, ordered by date desc.
    Never returns 404 — returns empty array if no data.
    """
    offset = (page - 1) * page_size
    reports_list: List[Dict[str, Any]] = []

    # --- 1) Consultations (primary source of data) ---
    try:
        consult_result = await db.execute(
            select(Consultation)
            .where(
                Consultation.user_id == current_user.id,
                Consultation.ended_at.isnot(None),
            )
            .order_by(desc(Consultation.started_at))
            .offset(offset)
            .limit(page_size)
        )
        consultations = consult_result.scalars().all()

        for c in consultations:
            # Get message stats
            stats = await db.execute(
                select(
                    func.count(ConsultationMessage.id),
                    func.avg(ConsultationMessage.stress_at_message),
                    func.max(ConsultationMessage.stress_at_message),
                ).where(
                    ConsultationMessage.consultation_id == c.id,
                    ConsultationMessage.stress_at_message.isnot(None),
                )
            )
            row = stats.one()
            total_readings = int(row[0] or 0)
            avg_risk = float(row[1] or 0)
            peak_risk = float(row[2] or 0)

            # Check assessment
            assess = await db.execute(
                select(AssessmentResult).where(AssessmentResult.consultation_id == c.id)
            )
            assessment = assess.scalar_one_or_none()

            # Check if report exists
            report_result = await db.execute(
                select(Report).where(Report.consultation_id == c.id)
            )
            report = report_result.scalar_one_or_none()

            mood = _mood_from_risk(avg_risk)
            mode = _mode_label(c.model_rank or 1)

            duration = c.duration_seconds or 0

            reports_list.append({
                "session_id": c.id,
                "source": "consultation",
                "started_at": c.started_at.isoformat() if c.started_at else "",
                "ended_at": c.ended_at.isoformat() if c.ended_at else "",
                "duration_seconds": duration,
                "model_mode": mode,
                "total_readings": total_readings,
                "avg_wellness": round(max(0, 100 - avg_risk), 1),
                "peak_stress": round(peak_risk, 1),
                "mood_emoji": mood["emoji"],
                "mood_label": mood["label"],
                "has_assessment": assessment is not None,
                "phq9_score": assessment.phq9_score if assessment else None,
                "gad7_score": assessment.gad7_score if assessment else None,
                "summary_text": report.summary_text if report else None,
                "has_report": report is not None,
                "report_id": report.id if report else None,
            })
    except Exception as e:
        logger.warning("Error fetching consultation reports: %s", e)

    # --- 2) Live sessions (secondary) ---
    try:
        session_result = await db.execute(
            select(SessionModel)
            .where(
                SessionModel.user_id == current_user.id,
                SessionModel.ended_at.isnot(None),
            )
            .order_by(desc(SessionModel.started_at))
            .limit(page_size)
        )
        sessions = session_result.scalars().all()

        for s in sessions:
            reading_stats = await db.execute(
                select(
                    func.count(AnalysisReading.id),
                    func.avg(AnalysisReading.overall_risk),
                    func.max(AnalysisReading.overall_risk),
                ).where(AnalysisReading.session_id == s.id)
            )
            row = reading_stats.one()
            total_readings = int(row[0] or 0)
            avg_risk = float(row[1] or 0)
            peak_risk = float(row[2] or 0)

            mood = _mood_from_risk(avg_risk)
            mode = _mode_label(s.model_rank or 1)

            report_result = await db.execute(
                select(Report).where(Report.session_id == s.id)
            )
            report = report_result.scalar_one_or_none()

            duration = s.duration_seconds or 0

            reports_list.append({
                "session_id": s.id,
                "source": "session",
                "started_at": s.started_at.isoformat() if s.started_at else "",
                "ended_at": s.ended_at.isoformat() if s.ended_at else "",
                "duration_seconds": duration,
                "model_mode": mode,
                "total_readings": total_readings,
                "avg_wellness": round(max(0, 100 - avg_risk), 1),
                "peak_stress": round(peak_risk, 1),
                "mood_emoji": mood["emoji"],
                "mood_label": mood["label"],
                "has_assessment": False,
                "phq9_score": None,
                "gad7_score": None,
                "summary_text": report.summary_text if report else None,
                "has_report": report is not None,
                "report_id": report.id if report else None,
            })
    except Exception as e:
        logger.warning("Error fetching session reports: %s", e)

    # Sort by started_at desc
    reports_list.sort(key=lambda r: r.get("started_at", ""), reverse=True)

    return {"reports": reports_list, "total": len(reports_list), "page": page, "page_size": page_size}


# ---------------------------------------------------------------------------
# GET /reports/{session_id} — Full session detail
# ---------------------------------------------------------------------------

@router.get("/{session_id}")
async def get_report_detail(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get full report detail for a session/consultation."""

    # Try consultation first
    consult_result = await db.execute(
        select(Consultation).where(Consultation.id == session_id)
    )
    consultation = consult_result.scalar_one_or_none()

    if consultation:
        if consultation.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

        # Fetch messages as timeline
        msgs_result = await db.execute(
            select(ConsultationMessage)
            .where(ConsultationMessage.consultation_id == session_id)
            .order_by(ConsultationMessage.timestamp)
        )
        messages = msgs_result.scalars().all()

        # Build timeline
        timeline: List[Dict] = []
        start_time = consultation.started_at
        emotion_totals: Dict[str, float] = {}
        emotion_counts = 0
        all_alerts: List[Dict] = []

        for msg in messages:
            if msg.stress_at_message is None:
                continue
            stress = msg.stress_at_message or 0
            anxiety = msg.anxiety_at_message or 0
            stability = max(0, 100 - stress * 0.7)
            depression_risk = min(100, stress * 0.4 + anxiety * 0.3)
            overall_risk = min(100, stress * 0.35 + anxiety * 0.35 + depression_risk * 0.3)

            elapsed = 0
            if start_time and msg.timestamp:
                elapsed = max(0, (msg.timestamp - start_time).total_seconds())

            emotions = msg.emotions_json or {}
            for emo, val in emotions.items():
                emotion_totals[emo] = emotion_totals.get(emo, 0) + float(val)
            if emotions:
                emotion_counts += 1

            timeline.append({
                "seconds_elapsed": round(elapsed),
                "stress": round(stress, 1),
                "anxiety": round(anxiety, 1),
                "stability": round(stability, 1),
                "depression_risk": round(depression_risk, 1),
                "overall_risk": round(overall_risk, 1),
                "emotions": emotions,
            })

            # Detect alerts
            if stress > 80:
                all_alerts.append({
                    "seconds_elapsed": round(elapsed),
                    "severity": "high",
                    "text": f"Intensity peaked at {elapsed / 60:.0f} min",
                })
            elif anxiety > 70:
                all_alerts.append({
                    "seconds_elapsed": round(elapsed),
                    "severity": "medium",
                    "text": f"A moment of tension at {elapsed / 60:.0f} min",
                })
            elif stress > 60:
                all_alerts.append({
                    "seconds_elapsed": round(elapsed),
                    "severity": "low",
                    "text": f"A small wave at {elapsed / 60:.0f} min",
                })

        # Emotion summary (averages)
        emotion_summary = {}
        if emotion_counts > 0:
            emotion_summary = {k: round(v / emotion_counts, 1) for k, v in emotion_totals.items()}

        # Compute overall metrics
        if timeline:
            avg_risk = sum(t["overall_risk"] for t in timeline) / len(timeline)
            peak_risk = max(t["overall_risk"] for t in timeline)
        else:
            avg_risk = consultation.final_risk_score or 0
            peak_risk = avg_risk

        # Fetch assessment
        assess_result = await db.execute(
            select(AssessmentResult).where(AssessmentResult.consultation_id == session_id)
        )
        assessment = assess_result.scalar_one_or_none()

        assessment_data = None
        if assessment:
            # Build Q&A from messages
            qa_list = []
            q_msgs = [m for m in messages if m.is_assessment_question and m.sender == "ai"]
            a_msgs = [m for m in messages if m.is_assessment_question and m.sender == "patient"]

            for qm in q_msgs:
                q_idx = qm.assessment_q_index
                answer_msg = next((am for am in a_msgs if am.assessment_q_index == q_idx), None)
                qa_list.append({
                    "index": q_idx,
                    "question": qm.message_text.split(": ", 1)[-1] if ": " in qm.message_text else qm.message_text,
                    "answer_value": answer_msg.assessment_answer if answer_msg else None,
                    "answer_label": answer_msg.message_text.split(": ", 1)[-1] if answer_msg else None,
                })

            assessment_data = {
                "mood_score": assessment.phq9_score,
                "worry_score": assessment.gad7_score,
                "mood_level": assessment.phq9_level or "",
                "worry_level": assessment.gad7_level or "",
                "q9_flagged": assessment.q9_positive or False,
                "q17_flagged": assessment.q17_positive or False,
                "questions_and_answers": qa_list,
            }

        # Fetch or compute summary
        report_result = await db.execute(
            select(Report).where(Report.consultation_id == session_id)
        )
        report = report_result.scalar_one_or_none()

        mood = _mood_from_risk(avg_risk)
        mode = _mode_label(consultation.model_rank or 1)
        duration = consultation.duration_seconds or 0

        summary_data = None
        if report and report.summary_text:
            summary_data = {
                "text": report.summary_text,
                "observations": _build_observations(avg_risk, peak_risk, len(timeline), duration // 60),
                "recommendations": report.recommendations_json or _build_recommendations(avg_risk, peak_risk, assessment is not None),
            }

        return {
            "session_id": session_id,
            "source": "consultation",
            "started_at": consultation.started_at.isoformat() if consultation.started_at else "",
            "ended_at": consultation.ended_at.isoformat() if consultation.ended_at else "",
            "duration_seconds": duration,
            "model_mode": mode,
            "avg_risk": round(avg_risk, 1),
            "peak_risk": round(peak_risk, 1),
            "avg_wellness": round(max(0, 100 - avg_risk), 1),
            "mood_emoji": mood["emoji"],
            "mood_label": mood["label"],
            "total_readings": len(timeline),
            "timeline": timeline,
            "emotion_summary": emotion_summary,
            "alerts": all_alerts,
            "assessment": assessment_data,
            "summary": summary_data,
        }

    # Try session (live analysis)
    session_result = await db.execute(
        select(SessionModel).where(SessionModel.id == session_id)
    )
    session = session_result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

    # Fetch readings
    readings_result = await db.execute(
        select(AnalysisReading)
        .where(AnalysisReading.session_id == session_id)
        .order_by(AnalysisReading.timestamp)
    )
    readings = readings_result.scalars().all()

    timeline = []
    emotion_totals = {}
    emotion_counts = 0
    all_alerts = []
    start_time = session.started_at

    for r in readings:
        elapsed = 0
        if start_time and r.timestamp:
            elapsed = max(0, (r.timestamp - start_time).total_seconds())

        emotions = r.emotions_json or {}
        for emo, val in emotions.items():
            emotion_totals[emo] = emotion_totals.get(emo, 0) + float(val)
        if emotions:
            emotion_counts += 1

        timeline.append({
            "seconds_elapsed": round(elapsed),
            "stress": round(r.stress, 1),
            "anxiety": round(r.anxiety, 1),
            "stability": round(r.stability, 1),
            "depression_risk": round(r.depression_risk, 1),
            "overall_risk": round(r.overall_risk, 1),
            "emotions": emotions,
        })

        if r.stress > 80:
            all_alerts.append({"seconds_elapsed": round(elapsed), "severity": "high", "text": f"Intensity peaked at {elapsed / 60:.0f} min"})
        elif r.anxiety > 70:
            all_alerts.append({"seconds_elapsed": round(elapsed), "severity": "medium", "text": f"A moment of tension at {elapsed / 60:.0f} min"})
        elif r.stress > 60:
            all_alerts.append({"seconds_elapsed": round(elapsed), "severity": "low", "text": f"A small wave at {elapsed / 60:.0f} min"})

    emotion_summary = {}
    if emotion_counts > 0:
        emotion_summary = {k: round(v / emotion_counts, 1) for k, v in emotion_totals.items()}

    if timeline:
        avg_risk = sum(t["overall_risk"] for t in timeline) / len(timeline)
        peak_risk = max(t["overall_risk"] for t in timeline)
    else:
        avg_risk = session.final_risk_score or 0
        peak_risk = avg_risk

    report_result = await db.execute(
        select(Report).where(Report.session_id == session_id)
    )
    report = report_result.scalar_one_or_none()

    mood = _mood_from_risk(avg_risk)
    mode = _mode_label(session.model_rank or 1)
    duration = session.duration_seconds or 0

    summary_data = None
    if report and report.summary_text:
        summary_data = {
            "text": report.summary_text,
            "observations": _build_observations(avg_risk, peak_risk, len(timeline), duration // 60),
            "recommendations": report.recommendations_json or _build_recommendations(avg_risk, peak_risk, False),
        }

    return {
        "session_id": session_id,
        "source": "session",
        "started_at": session.started_at.isoformat() if session.started_at else "",
        "ended_at": session.ended_at.isoformat() if session.ended_at else "",
        "duration_seconds": duration,
        "model_mode": mode,
        "avg_risk": round(avg_risk, 1),
        "peak_risk": round(peak_risk, 1),
        "avg_wellness": round(max(0, 100 - avg_risk), 1),
        "mood_emoji": mood["emoji"],
        "mood_label": mood["label"],
        "total_readings": len(timeline),
        "timeline": timeline,
        "emotion_summary": emotion_summary,
        "alerts": all_alerts,
        "assessment": None,
        "summary": summary_data,
    }


# ---------------------------------------------------------------------------
# POST /reports/{session_id}/generate — Build summary
# ---------------------------------------------------------------------------

@router.post("/{session_id}/generate")
async def generate_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate a wellness report summary for a session/consultation.
    
    If already generated, returns existing. Does not regenerate.
    """
    # Determine source
    consult_result = await db.execute(
        select(Consultation).where(Consultation.id == session_id, Consultation.user_id == current_user.id)
    )
    consultation = consult_result.scalar_one_or_none()

    session_obj = None
    if not consultation:
        session_result = await db.execute(
            select(SessionModel).where(SessionModel.id == session_id, SessionModel.user_id == current_user.id)
        )
        session_obj = session_result.scalar_one_or_none()

    if not consultation and not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Check existing report
    if consultation:
        existing = await db.execute(
            select(Report).where(Report.consultation_id == session_id, Report.user_id == current_user.id)
        )
    else:
        existing = await db.execute(
            select(Report).where(Report.session_id == session_id, Report.user_id == current_user.id)
        )
    report = existing.scalar_one_or_none()

    if report and report.summary_text:
        # Already generated — return existing
        return {
            "text": report.summary_text,
            "key_observations": _build_observations(
                report.avg_stress or 0, report.peak_stress or 0, 0,
                (consultation.duration_seconds if consultation else (session_obj.duration_seconds if session_obj else 0)) // 60
            ),
            "recommendations": report.recommendations_json or [],
        }

    # Compute metrics
    if consultation:
        stats = await db.execute(
            select(
                func.count(ConsultationMessage.id),
                func.avg(ConsultationMessage.stress_at_message),
                func.max(ConsultationMessage.stress_at_message),
            ).where(
                ConsultationMessage.consultation_id == session_id,
                ConsultationMessage.stress_at_message.isnot(None),
            )
        )
        row = stats.one()
        total_readings = int(row[0] or 0)
        avg_risk = float(row[1] or 0)
        peak_risk = float(row[2] or 0)
        duration = consultation.duration_seconds or 0

        assess_r = await db.execute(
            select(AssessmentResult).where(AssessmentResult.consultation_id == session_id)
        )
        has_assessment = assess_r.scalar_one_or_none() is not None
    else:
        stats = await db.execute(
            select(
                func.count(AnalysisReading.id),
                func.avg(AnalysisReading.overall_risk),
                func.max(AnalysisReading.overall_risk),
            ).where(AnalysisReading.session_id == session_id)
        )
        row = stats.one()
        total_readings = int(row[0] or 0)
        avg_risk = float(row[1] or 0)
        peak_risk = float(row[2] or 0)
        duration = session_obj.duration_seconds or 0 if session_obj else 0
        has_assessment = False

    wellness = max(0, 100 - avg_risk)
    duration_min = duration // 60
    level = _friendly_level(avg_risk)
    mood = _mood_from_risk(avg_risk)

    # Build summary text
    summary_text = (
        f"During your {duration_min}-minute session, your overall wellness was {wellness:.0f}%. "
        f"You showed {level.lower()} levels of tension throughout, "
        f"and your mood was generally {mood['label'].lower()}. "
        f"{'You experienced some peak moments of intensity, but recovered well. ' if peak_risk > 60 else ''}"
        f"{'Your calm and steady presence shone through the session. ' if avg_risk < 30 else ''}"
        f"We gathered {total_readings} data points to give you this picture of your wellbeing."
    )

    observations = _build_observations(avg_risk, peak_risk, total_readings, duration_min)
    recommendations = _build_recommendations(avg_risk, peak_risk, has_assessment)

    # Save report
    if report:
        report.summary_text = summary_text
        report.avg_stress = round(avg_risk, 2)
        report.peak_stress = round(peak_risk, 2)
        report.recommendations_json = recommendations
    else:
        report = Report(
            user_id=current_user.id,
            summary_text=summary_text,
            avg_stress=round(avg_risk, 2),
            peak_stress=round(peak_risk, 2),
            recommendations_json=recommendations,
        )
        if consultation:
            report.consultation_id = session_id
        else:
            report.session_id = session_id
        db.add(report)

    await db.flush()

    return {
        "text": summary_text,
        "key_observations": observations,
        "recommendations": recommendations,
    }


# ---------------------------------------------------------------------------
# GET /reports/{session_id}/pdf — Download PDF
# ---------------------------------------------------------------------------

@router.get("/{session_id}/pdf")
async def download_report_pdf(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Generate and return a PDF wellness report."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF generation requires reportlab. Install with: pip install reportlab",
        )

    # Get report detail
    detail = await get_report_detail(session_id, current_user, db)

    # Auto-generate if needed
    if not detail.get("summary"):
        gen = await generate_report(session_id, current_user, db)
        detail["summary"] = {
            "text": gen["text"],
            "observations": gen["key_observations"],
            "recommendations": gen["recommendations"],
        }

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=22, textColor=HexColor("#2c5282"), spaceAfter=6)
    subtitle_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=10, textColor=HexColor("#718096"), spaceAfter=12)
    heading_style = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=14, textColor=HexColor("#2c5282"), spaceAfter=8, spaceBefore=16)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, textColor=HexColor("#4a5568"), leading=14, spaceAfter=6)
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=HexColor("#a0aec0"), alignment=1, spaceBefore=20)
    bullet_style = ParagraphStyle("Bullet", parent=body_style, leftIndent=12, bulletIndent=0)

    elements = []

    # Header
    elements.append(Paragraph("MindTrack — Wellness Report", title_style))
    started = detail.get("started_at", "")
    date_str = ""
    if started:
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(started.replace("Z", "+00:00"))
            date_str = dt.strftime("%B %d, %Y at %I:%M %p")
        except Exception:
            date_str = started
    dur = detail.get("duration_seconds", 0) or 0
    dur_str = f"{dur // 60}m {dur % 60}s" if dur > 0 else "—"
    mode = detail.get("model_mode", {})
    mode_str = f"{mode.get('emoji', '')} {mode.get('label', '')}" if isinstance(mode, dict) else str(mode)
    elements.append(Paragraph(f"Date: {date_str}  •  Duration: {dur_str}  •  Mode: {mode_str}", subtitle_style))
    elements.append(Spacer(1, 6))

    # Wellness score card
    wellness = detail.get("avg_wellness", 0)
    mood_emoji = detail.get("mood_emoji", "")
    mood_label = detail.get("mood_label", "")
    peak = detail.get("peak_risk", 0)

    score_data = [
        ["Wellness Score", "Peak Intensity", "Mood"],
        [f"{wellness:.0f}%", f"{100 - peak:.0f}%", f"{mood_emoji} {mood_label}"],
    ]
    score_table = Table(score_data, colWidths=[60 * mm, 60 * mm, 50 * mm])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#ebf4ff")),
        ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#2c5282")),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, 1), 16),
        ("TEXTCOLOR", (0, 1), (-1, 1), HexColor("#2c5282")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 1), (-1, 1), 10),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e0")),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 10))

    # Summary
    summary = detail.get("summary")
    if summary:
        elements.append(Paragraph("Your Session Reflection", heading_style))
        elements.append(Paragraph(summary.get("text", ""), body_style))

        observations = summary.get("observations", [])
        if observations:
            elements.append(Paragraph("Key Observations", heading_style))
            for obs in observations:
                elements.append(Paragraph(f"✦ {obs}", bullet_style))

        recommendations = summary.get("recommendations", [])
        if recommendations:
            elements.append(Paragraph("Next Steps", heading_style))
            for rec in recommendations:
                elements.append(Paragraph(f"→ {rec}", bullet_style))

    # Assessment
    assessment = detail.get("assessment")
    if assessment:
        elements.append(Paragraph("Wellness Check-in Results", heading_style))
        mood_score = assessment.get("mood_score", 0)
        worry_score = assessment.get("worry_score", 0)
        mood_lvl = assessment.get("mood_level", "")
        worry_lvl = assessment.get("worry_level", "")
        elements.append(Paragraph(f"Mood Check: {mood_score}/27 ({mood_lvl})", body_style))
        elements.append(Paragraph(f"Worry Check: {worry_score}/21 ({worry_lvl})", body_style))

    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        "MindTrack is a wellness support tool, not a substitute for professional care. "
        "If you are in crisis, please call 988 or text HOME to 741741.",
        footer_style,
    ))

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="mindtrack-report-{session_id[:8]}.pdf"'},
    )
