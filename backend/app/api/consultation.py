"""Consultation API routes — one-on-one patient consultation system.

Provides REST endpoints for starting/ending consultations, retrieving history,
and a WebSocket endpoint for real-time analysis + LIVE AI streaming conversation.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import async_session_factory, get_db
from app.core.security import decode_token
from app.core.websocket import manager
from app.core.ai_engine import (
    generate_live_response,
    generate_live_response_stream,
    detect_personality_mode,
    get_fallback_response,
    build_system_prompt,
)
from app.db.models import (
    AssessmentResult,
    Consultation,
    ConsultationMessage,
    Report,
    User,
)
from app.api.auth import get_current_user
from app.schemas.consultation import (
    AssessmentResultResponse,
    ConsultationEndResponse,
    ConsultationHistoryResponse,
    ConsultationListResponse,
    ConsultationMessageResponse,
    ConsultationStartRequest,
    ConsultationStartResponse,
    ConsultationSummaryResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/consultation", tags=["Consultation"])
settings = get_settings()


# ---------------------------------------------------------------------------
# PHQ-9 + GAD-7 Assessment Questions
# ---------------------------------------------------------------------------

ASSESSMENT_QUESTIONS: List[Dict] = [
    {"index": 1, "category": "PHQ-9", "text": "Little interest or pleasure in doing things?"},
    {"index": 2, "category": "PHQ-9", "text": "Feeling down, depressed, or hopeless?"},
    {"index": 3, "category": "PHQ-9", "text": "Trouble falling or staying asleep, or sleeping too much?"},
    {"index": 4, "category": "PHQ-9", "text": "Feeling tired or having little energy?"},
    {"index": 5, "category": "PHQ-9", "text": "Poor appetite or overeating?"},
    {"index": 6, "category": "PHQ-9", "text": "Feeling bad about yourself — or that you are a failure or have let yourself or your family down?"},
    {"index": 7, "category": "PHQ-9", "text": "Trouble concentrating on things, such as reading the newspaper or watching television?"},
    {"index": 8, "category": "PHQ-9", "text": "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual?"},
    {"index": 9, "category": "PHQ-9", "text": "Thoughts that you would be better off dead, or of hurting yourself?"},
    {"index": 10, "category": "GAD-7", "text": "Feeling nervous, anxious, or on edge?"},
    {"index": 11, "category": "GAD-7", "text": "Not being able to stop or control worrying?"},
    {"index": 12, "category": "GAD-7", "text": "Worrying too much about different things?"},
    {"index": 13, "category": "GAD-7", "text": "Trouble relaxing?"},
    {"index": 14, "category": "GAD-7", "text": "Being so restless that it is hard to sit still?"},
    {"index": 15, "category": "GAD-7", "text": "Becoming easily annoyed or irritable?"},
    {"index": 16, "category": "GAD-7", "text": "Feeling afraid, as if something awful might happen?"},
    {"index": 17, "category": "Safety", "text": "Have you had any thoughts of self-harm or harming others?"},
]

ANSWER_OPTIONS = [
    {"value": 0, "label": "Not at all"},
    {"value": 1, "label": "Several days"},
    {"value": 2, "label": "More than half the days"},
    {"value": 3, "label": "Nearly every day"},
]


# ---------------------------------------------------------------------------
# Demo analysis generator (unchanged — for stress gauges)
# ---------------------------------------------------------------------------

def _generate_demo_analysis() -> Dict:
    """Generate realistic demo analysis data for consultation."""
    stress = max(0, min(100, 30 + random.gauss(0, 15)))
    anxiety = max(0, min(100, 25 + random.gauss(0, 12)))
    stability = max(0, min(100, 100 - stress * 0.7 + random.gauss(0, 3)))
    depression_risk = max(0, min(100, stress * 0.4 + anxiety * 0.3 + random.gauss(0, 5)))
    overall = max(0, min(100, stress * 0.35 + anxiety * 0.35 + depression_risk * 0.3))

    emotions_raw = {
        "neutral": max(0, 40 - stress * 0.3 + random.gauss(0, 5)),
        "happy": max(0, 20 - stress * 0.2 + random.gauss(0, 3)),
        "tense": max(0, stress * 0.4 + random.gauss(0, 4)),
        "anxious": max(0, anxiety * 0.5 + random.gauss(0, 3)),
        "sad": max(0, depression_risk * 0.3 + random.gauss(0, 3)),
        "fear": max(0, anxiety * 0.2 + random.gauss(0, 2)),
        "surprised": max(0, 5 + random.gauss(0, 3)),
    }
    total = sum(emotions_raw.values()) or 1.0
    emotions = {k: round(v / total * 100, 1) for k, v in emotions_raw.items()}

    return {
        "stress": round(stress, 1),
        "anxiety": round(anxiety, 1),
        "stability": round(stability, 1),
        "depression_risk": round(depression_risk, 1),
        "overall_risk": round(overall, 1),
        "emotions": emotions,
        "voice_freq": round(180 + random.gauss(0, 30), 1),
        "voice_amplitude": round(0.4 + random.gauss(0, 0.1), 3),
        "micro_expression_pct": round(random.uniform(2, 15), 1),
        "confidence": round(random.uniform(0.72, 0.95), 3),
    }


# ---------------------------------------------------------------------------
# PHQ-9 / GAD-7 scoring
# ---------------------------------------------------------------------------

def _score_phq9(answers: Dict[int, int]) -> Tuple[int, str]:
    score = sum(answers.get(i, 0) for i in range(1, 10))
    if score <= 4: level = "Minimal"
    elif score <= 9: level = "Mild"
    elif score <= 14: level = "Moderate"
    elif score <= 19: level = "Moderately Severe"
    else: level = "Severe"
    return score, level


def _score_gad7(answers: Dict[int, int]) -> Tuple[int, str]:
    score = sum(answers.get(i, 0) for i in range(10, 17))
    if score <= 4: level = "Minimal"
    elif score <= 9: level = "Mild"
    elif score <= 14: level = "Moderate"
    else: level = "Severe"
    return score, level


def _generate_assessment_report(
    phq9_score: int, phq9_level: str, gad7_score: int, gad7_level: str,
    q9_positive: bool, q17_positive: bool,
) -> Tuple[str, List[str]]:
    lines = [
        f"🌟 **Wellness Check-in Complete**\n",
        f"**Mood Check:** {phq9_score}/27 — {phq9_level}",
        f"**Worry Check:** {gad7_score}/21 — {gad7_level}\n",
    ]
    recs: List[str] = []
    if phq9_score <= 4: recs.append("Your mood is in a healthy range. Keep up your current wellness routines 🌟")
    elif phq9_score <= 9: recs.append("Mild low mood detected. Try daily walks, good sleep habits, and staying connected.")
    elif phq9_score <= 14: recs.append("Moderate low mood. Consider talking to a professional for personalized support.")
    elif phq9_score <= 19: recs.append("Your mood scores suggest you could really benefit from professional support 💜")
    else: recs.append("Significant difficulty detected. Please reach out to a mental health professional.")
    if gad7_score <= 4: recs.append("Your worry levels are within a normal range.")
    elif gad7_score <= 9: recs.append("Mild worry. Try relaxation techniques like deep breathing.")
    elif gad7_score <= 14: recs.append("Moderate worry. A therapist can teach you effective tools for managing anxiety.")
    else: recs.append("Significant worry detected. Professional support is strongly recommended.")
    if phq9_score > 10 or gad7_score > 10:
        recs.append("Speaking with a licensed professional would give you the best tools to feel better.")
    if q9_positive or q17_positive:
        recs.append("💜 Important: Please reach out — call 988 or text HOME to 741741. You matter.")
    summary = "\n".join(lines) + "\n**What we suggest:**\n" + "\n".join(f"• {r}" for r in recs)
    return summary, recs


# ---------------------------------------------------------------------------
# Redis context helpers
# ---------------------------------------------------------------------------

async def _get_chat_context(session_id: str) -> Dict:
    """Load conversation context from Redis."""
    try:
        from app.core.redis_client import get_redis
        redis = await get_redis()
        raw = await redis.get(f"chat:{session_id}")
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.debug("Redis context load failed: %s", e)
    return {
        "turn_count": 0,
        "language": "en",
        "personality_mode": "companion",
        "complexity_profile": "reflective",
        "user_name": "",
        "last_stress": 50,
        "session_start": datetime.now(timezone.utc).isoformat(),
    }


async def _save_chat_context(session_id: str, context: Dict) -> None:
    """Save conversation context to Redis with 4-hour TTL."""
    try:
        from app.core.redis_client import get_redis
        redis = await get_redis()
        await redis.setex(f"chat:{session_id}", 14400, json.dumps(context))
    except Exception as e:
        logger.debug("Redis context save failed: %s", e)


async def _load_message_history(consultation_id: str, limit: int = 30) -> List[Dict]:
    """Load conversation history from DB for AI context."""
    try:
        async with async_session_factory() as db:
            result = await db.execute(
                select(ConsultationMessage)
                .where(ConsultationMessage.consultation_id == consultation_id)
                .order_by(ConsultationMessage.timestamp)
            )
            messages = result.scalars().all()
            history = []
            for m in messages[-limit:]:
                history.append({
                    "sender": m.sender,
                    "text": m.message_text or "",
                })
            return history
    except Exception as e:
        logger.warning("Failed to load message history: %s", e)
        return []


async def _save_message(
    consultation_id: str,
    sender: str,
    text: str,
    stress_data: Optional[Dict] = None,
    input_method: str = "text",
    camera_data: Optional[Dict] = None,
) -> None:
    """Save a message to DB (non-blocking)."""
    try:
        async with async_session_factory() as db:
            msg = ConsultationMessage(
                consultation_id=consultation_id,
                sender=sender,
                message_text=text,
                stress_at_message=stress_data.get("stress") if stress_data else None,
                anxiety_at_message=stress_data.get("anxiety") if stress_data else None,
                emotions_json=stress_data.get("emotions") if stress_data else None,
                input_method=input_method if sender == "patient" else "text",
                camera_snapshot=camera_data if camera_data else None,
            )
            db.add(msg)
            await db.commit()
    except Exception as e:
        logger.warning("Failed to save message: %s", e)


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------

@router.post("/start", response_model=ConsultationStartResponse, status_code=status.HTTP_201_CREATED)
async def start_consultation(
    body: ConsultationStartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConsultationStartResponse:
    consultation = Consultation(
        user_id=current_user.id,
        model_rank=body.model_rank,
        mode=body.mode,
    )
    db.add(consultation)
    await db.flush()
    ws_url = f"/ws/consultation/{consultation.id}"
    return ConsultationStartResponse(
        consultation_id=consultation.id,
        websocket_url=ws_url,
        mode=consultation.mode,
        model_rank=consultation.model_rank,
        started_at=consultation.started_at.isoformat() if consultation.started_at else "",
    )


@router.post("/{consultation_id}/end", response_model=ConsultationEndResponse)
async def end_consultation(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConsultationEndResponse:
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id, Consultation.user_id == current_user.id)
    )
    consultation = result.scalar_one_or_none()
    if consultation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")

    consultation.ended_at = datetime.now(timezone.utc)
    consultation.status = "completed"
    if consultation.started_at:
        consultation.duration_seconds = int((consultation.ended_at - consultation.started_at).total_seconds())

    msgs_result = await db.execute(
        select(func.avg(ConsultationMessage.stress_at_message), func.count(ConsultationMessage.id))
        .where(ConsultationMessage.consultation_id == consultation_id)
    )
    row = msgs_result.one()
    avg_risk = float(row[0] or 0)
    msg_count = row[1] or 0
    consultation.final_risk_score = round(avg_risk, 2)
    duration_min = (consultation.duration_seconds or 0) // 60
    consultation.summary_text = f"Session completed in {duration_min}m with {msg_count} messages."

    assess_result = await db.execute(
        select(AssessmentResult).where(AssessmentResult.consultation_id == consultation_id)
    )
    assessment = assess_result.scalar_one_or_none()

    # Auto-generate Report
    try:
        peak_result = await db.execute(
            select(func.max(ConsultationMessage.stress_at_message)).where(
                ConsultationMessage.consultation_id == consultation_id,
                ConsultationMessage.stress_at_message.isnot(None),
            )
        )
        peak_stress = float(peak_result.scalar() or avg_risk)
        wellness = max(0, 100 - avg_risk)
        level = "minimal" if avg_risk < 30 else "mild" if avg_risk < 50 else "moderate" if avg_risk < 70 else "significant"
        recommendations: List[str] = []
        if avg_risk < 30:
            recommendations.append("Your wellness levels are in a healthy range 🌟")
        elif avg_risk < 50:
            recommendations.append("A daily 5-minute breathing exercise could help.")
        elif avg_risk < 70:
            recommendations.append("Consider 10 minutes daily for mindfulness.")
        else:
            recommendations.append("Please be gentle with yourself. Consider professional support 💜")

        report_summary = f"During your {duration_min}-minute session, your overall wellness was {wellness:.0f}%."
        existing_report = await db.execute(
            select(Report).where(Report.consultation_id == consultation_id, Report.user_id == current_user.id)
        )
        report = existing_report.scalar_one_or_none()
        if report:
            report.summary_text = report_summary
            report.avg_stress = round(avg_risk, 2)
            report.peak_stress = round(peak_stress, 2)
            report.recommendations_json = recommendations
        else:
            report = Report(
                consultation_id=consultation_id, user_id=current_user.id,
                summary_text=report_summary, avg_stress=round(avg_risk, 2),
                peak_stress=round(peak_stress, 2), recommendations_json=recommendations,
            )
            db.add(report)
    except Exception as e:
        logger.warning("Failed to auto-generate report: %s", e)

    await db.flush()
    return ConsultationEndResponse(
        consultation_id=consultation.id,
        duration_seconds=consultation.duration_seconds or 0,
        summary=consultation.summary_text or "",
        phq9_score=assessment.phq9_score if assessment else None,
        gad7_score=assessment.gad7_score if assessment else None,
        final_risk_score=consultation.final_risk_score,
        recommendations=assessment.recommendations_json if assessment else [],
    )


@router.get("/{consultation_id}/history", response_model=ConsultationHistoryResponse)
async def get_consultation_history(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConsultationHistoryResponse:
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id, Consultation.user_id == current_user.id)
    )
    consultation = result.scalar_one_or_none()
    if consultation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found")

    msgs_result = await db.execute(
        select(ConsultationMessage).where(ConsultationMessage.consultation_id == consultation_id)
        .order_by(ConsultationMessage.timestamp)
    )
    messages = msgs_result.scalars().all()

    assess_result = await db.execute(
        select(AssessmentResult).where(AssessmentResult.consultation_id == consultation_id)
    )
    assessment = assess_result.scalar_one_or_none()

    return ConsultationHistoryResponse(
        consultation_id=consultation.id,
        mode=consultation.mode,
        status=consultation.status,
        started_at=consultation.started_at.isoformat() if consultation.started_at else "",
        ended_at=consultation.ended_at.isoformat() if consultation.ended_at else None,
        duration_seconds=consultation.duration_seconds,
        model_rank=consultation.model_rank,
        final_risk_score=consultation.final_risk_score,
        messages=[
            ConsultationMessageResponse(
                id=m.id, sender=m.sender, message_text=m.message_text,
                timestamp=m.timestamp.isoformat() if m.timestamp else "",
                stress_at_message=m.stress_at_message, anxiety_at_message=m.anxiety_at_message,
                emotions_json=m.emotions_json,
                is_assessment_question=m.is_assessment_question or False,
                assessment_q_index=m.assessment_q_index, assessment_answer=m.assessment_answer,
                voice_transcript=m.voice_transcript, input_method=m.input_method or "text",
            )
            for m in messages
        ],
        assessment_result=(
            AssessmentResultResponse(
                id=assessment.id, consultation_id=assessment.consultation_id,
                phq9_score=assessment.phq9_score, gad7_score=assessment.gad7_score,
                phq9_level=assessment.phq9_level or "", gad7_level=assessment.gad7_level or "",
                q9_positive=assessment.q9_positive or False, q17_positive=assessment.q17_positive or False,
                completed_at=assessment.completed_at.isoformat() if assessment.completed_at else "",
                recommendations=assessment.recommendations_json or [],
            ) if assessment else None
        ),
    )


@router.get("/{consultation_id}/messages")
async def get_consultation_messages(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id, Consultation.user_id == current_user.id)
    )
    consultation = result.scalar_one_or_none()
    if consultation is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    msgs_result = await db.execute(
        select(ConsultationMessage).where(ConsultationMessage.consultation_id == consultation_id)
        .order_by(ConsultationMessage.timestamp)
    )
    messages = msgs_result.scalars().all()
    return {
        "messages": [
            {
                "id": m.id, "sender": m.sender, "message_text": m.message_text,
                "timestamp": m.timestamp.isoformat() if m.timestamp else "",
                "stress_at_message": m.stress_at_message, "anxiety_at_message": m.anxiety_at_message,
                "emotions_json": m.emotions_json,
                "is_assessment_question": m.is_assessment_question or False,
                "assessment_q_index": m.assessment_q_index, "assessment_answer": m.assessment_answer,
                "input_method": m.input_method or "text", "image_url": m.image_url,
            }
            for m in messages
        ]
    }


@router.get("/all", response_model=ConsultationListResponse)
async def list_consultations(
    page: int = 1, page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConsultationListResponse:
    offset = (page - 1) * page_size
    count_result = await db.execute(
        select(func.count(Consultation.id)).where(Consultation.user_id == current_user.id)
    )
    total = count_result.scalar() or 0
    result = await db.execute(
        select(Consultation).where(Consultation.user_id == current_user.id)
        .order_by(desc(Consultation.started_at)).offset(offset).limit(page_size)
    )
    consultations = result.scalars().all()

    summaries: List[ConsultationSummaryResponse] = []
    for c in consultations:
        msg_count_result = await db.execute(
            select(func.count(ConsultationMessage.id)).where(ConsultationMessage.consultation_id == c.id)
        )
        msg_count = msg_count_result.scalar() or 0
        avg_stress_result = await db.execute(
            select(func.avg(ConsultationMessage.stress_at_message)).where(
                ConsultationMessage.consultation_id == c.id, ConsultationMessage.stress_at_message.isnot(None),
            )
        )
        avg_stress = float(avg_stress_result.scalar() or 0)
        assess_result = await db.execute(
            select(AssessmentResult).where(AssessmentResult.consultation_id == c.id)
        )
        assessment = assess_result.scalar_one_or_none()
        summaries.append(ConsultationSummaryResponse(
            id=c.id, user_id=c.user_id,
            started_at=c.started_at.isoformat() if c.started_at else "",
            ended_at=c.ended_at.isoformat() if c.ended_at else None,
            duration_seconds=c.duration_seconds, model_rank=c.model_rank,
            mode=c.mode, status=c.status,
            final_risk_score=c.final_risk_score or round(avg_stress, 1),
            message_count=msg_count, assessment_completed=assessment is not None,
            phq9_score=assessment.phq9_score if assessment else None,
            gad7_score=assessment.gad7_score if assessment else None,
        ))
    return ConsultationListResponse(consultations=summaries, total=total, page=page, page_size=page_size)


# ---------------------------------------------------------------------------
# WebSocket Endpoint — LIVE AI STREAMING
# ---------------------------------------------------------------------------

@router.websocket("/ws/consultation/{consultation_id}")
async def websocket_consultation(websocket: WebSocket, consultation_id: str) -> None:
    """WebSocket for real-time consultation with LIVE AI streaming responses."""

    # Authenticate
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001, reason="Invalid token")
        return
    user_id = payload.get("sub")

    await manager.connect(websocket, f"consult-{consultation_id}")
    logger.info("Consultation WS connected: consult_id=%s, user=%s", consultation_id, user_id)

    # Load context from Redis
    context = await _get_chat_context(consultation_id)

    # Load full conversation history from DB
    history = await _load_message_history(consultation_id, limit=30)

    # In-memory state
    assessment_answers: Dict[int, int] = {}
    current_mode = context.get("personality_mode", "companion")
    current_q_index = 1

    try:
        # --- Send welcome greeting (streamed from Claude) ---
        analysis = _generate_demo_analysis()
        greeting_msg_id = str(uuid.uuid4())

        await manager.send_json(websocket, {
            "type": "stream_start",
            "message_id": greeting_msg_id,
        })

        full_greeting = ""
        try:
            async for chunk in generate_live_response_stream(
                "The user just started a new wellness session. Greet them warmly in 2-3 sentences. Ask how they're feeling today.",
                [],
                context,
                analysis,
            ):
                full_greeting += chunk
                await manager.send_json(websocket, {
                    "type": "stream_chunk",
                    "text": chunk,
                    "message_id": greeting_msg_id,
                })
        except Exception:
            full_greeting = "Welcome to your wellness session. I'm here to support you — how are you feeling today? 💙"
            await manager.send_json(websocket, {
                "type": "stream_chunk",
                "text": full_greeting,
                "message_id": greeting_msg_id,
            })

        await manager.send_json(websocket, {
            "type": "stream_end",
            "message_id": greeting_msg_id,
            "stress_update": analysis,
            "language": context.get("language", "en"),
            "mode": context.get("personality_mode", "companion"),
        })

        # Save greeting to DB
        asyncio.create_task(_save_message(consultation_id, "ai", full_greeting, analysis))
        history.append({"sender": "ai", "text": full_greeting})

        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=120.0)
            except asyncio.TimeoutError:
                try:
                    await manager.send_json(websocket, {"type": "ping"})
                    continue
                except Exception:
                    break

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send_json(websocket, {"error": "Invalid JSON"})
                continue

            msg_type = data.get("type", "message")

            # --- Ping/Pong ---
            if msg_type == "ping":
                await manager.send_json(websocket, {"type": "pong"})
                continue

            # --- Mode switch ---
            if msg_type == "switch_mode":
                new_mode = data.get("mode", "live")
                current_mode = new_mode
                context["personality_mode"] = "companion"
                if new_mode == "assessment":
                    context["personality_mode"] = "clinical"
                    current_q_index = 1
                    assessment_answers.clear()

                response = {"type": "mode_switched", "mode": new_mode}
                if new_mode == "assessment":
                    q = ASSESSMENT_QUESTIONS[0]
                    response["question"] = {
                        "index": q["index"], "category": q["category"],
                        "text": q["text"], "options": ANSWER_OPTIONS,
                        "total": len(ASSESSMENT_QUESTIONS),
                    }
                    asyncio.create_task(_save_message(
                        consultation_id, "ai", f"Q{q['index']}: {q['text']}",
                    ))
                await manager.send_json(websocket, response)
                await _save_chat_context(consultation_id, context)
                continue

            # --- Model switch ---
            if msg_type == "switch_model":
                new_rank = data.get("model_rank", 1)
                labels = {1: "Best", 2: "Better", 3: "Good"}
                emojis = {1: "✨", 2: "⚡", 3: "🌿"}
                async with async_session_factory() as db:
                    r = await db.execute(select(Consultation).where(Consultation.id == consultation_id))
                    c = r.scalar_one_or_none()
                    if c:
                        c.model_rank = new_rank
                        await db.commit()
                await manager.send_json(websocket, {
                    "type": "model_switched", "model_rank": new_rank,
                    "name": labels.get(new_rank, "Best"),
                    "message": f"Switched to {emojis.get(new_rank, '✨')} {labels.get(new_rank, 'Best')} mode",
                })
                continue

            # --- Assessment answer ---
            if msg_type == "assessment_answer":
                answer_val = data.get("answer", 0)
                q_idx = data.get("question_index", current_q_index)
                assessment_answers[q_idx] = answer_val

                asyncio.create_task(_save_message(
                    consultation_id, "patient",
                    f"Answer to Q{q_idx}: {ANSWER_OPTIONS[min(answer_val, 3)]['label']}",
                ))

                analysis = _generate_demo_analysis()
                crisis_alerts: List[str] = []
                if q_idx == 9 and answer_val > 0:
                    crisis_alerts.append("💜 If you're having difficult thoughts, call 988 or text HOME to 741741.")
                if q_idx == 17 and answer_val > 0:
                    crisis_alerts.append("💜 Your safety matters. Call 988 or text HOME to 741741.")

                if q_idx < len(ASSESSMENT_QUESTIONS):
                    current_q_index = q_idx + 1
                    q = ASSESSMENT_QUESTIONS[current_q_index - 1]
                    response = {
                        "type": "assessment_next",
                        "question": {
                            "index": q["index"], "category": q["category"],
                            "text": q["text"], "options": ANSWER_OPTIONS,
                            "total": len(ASSESSMENT_QUESTIONS),
                        },
                        "progress": q_idx, "stress_update": analysis, "alerts": crisis_alerts,
                    }
                    asyncio.create_task(_save_message(
                        consultation_id, "ai", f"Q{q['index']}: {q['text']}", analysis,
                    ))
                else:
                    phq9_score, phq9_level = _score_phq9(assessment_answers)
                    gad7_score, gad7_level = _score_gad7(assessment_answers)
                    q9_positive = assessment_answers.get(9, 0) > 0
                    q17_positive = assessment_answers.get(17, 0) > 0
                    report_text, recommendations = _generate_assessment_report(
                        phq9_score, phq9_level, gad7_score, gad7_level, q9_positive, q17_positive,
                    )
                    async with async_session_factory() as db:
                        ar = AssessmentResult(
                            consultation_id=consultation_id,
                            phq9_score=phq9_score, gad7_score=gad7_score,
                            phq9_level=phq9_level, gad7_level=gad7_level,
                            q9_positive=q9_positive, q17_positive=q17_positive,
                            recommendations_json=recommendations,
                        )
                        db.add(ar)
                        ai_msg = ConsultationMessage(
                            consultation_id=consultation_id, sender="ai",
                            message_text=report_text, stress_at_message=analysis["stress"],
                            anxiety_at_message=analysis["anxiety"],
                        )
                        db.add(ai_msg)
                        await db.commit()
                    response = {
                        "type": "assessment_complete", "report": report_text,
                        "phq9_score": phq9_score, "phq9_level": phq9_level,
                        "gad7_score": gad7_score, "gad7_level": gad7_level,
                        "q9_positive": q9_positive, "q17_positive": q17_positive,
                        "recommendations": recommendations,
                        "stress_update": analysis, "alerts": crisis_alerts,
                    }
                await manager.send_json(websocket, response)
                continue

            # --- Regular chat message: LIVE AI STREAMING ---
            patient_text = data.get("text", "")
            input_method = data.get("input_method", "text")
            camera_data = data.get("camera_data", {})

            if not patient_text.strip():
                continue

            # Detect personality mode change
            context["personality_mode"] = detect_personality_mode(
                patient_text, context.get("personality_mode", "companion"),
            )

            # Send typing indicator immediately
            await manager.send_json(websocket, {"type": "typing", "is_typing": True})

            # Run analysis
            analysis = _generate_demo_analysis()

            # Save user message (non-blocking)
            asyncio.create_task(_save_message(
                consultation_id, "patient", patient_text, analysis, input_method, camera_data,
            ))

            # Generate message ID for streaming
            message_id = str(uuid.uuid4())

            # Start streaming
            await manager.send_json(websocket, {
                "type": "stream_start",
                "message_id": message_id,
            })

            # Stream response from Groq (with camera data)
            full_response = ""
            try:
                async for chunk in generate_live_response_stream(
                    patient_text, history, context, analysis, camera_data,
                ):
                    full_response += chunk
                    await manager.send_json(websocket, {
                        "type": "stream_chunk",
                        "text": chunk,
                        "message_id": message_id,
                    })
            except Exception as e:
                logger.error("Streaming error: %s", e)
                if not full_response:
                    full_response = get_fallback_response(context.get("language", "en"), "error")
                    await manager.send_json(websocket, {
                        "type": "stream_chunk",
                        "text": full_response,
                        "message_id": message_id,
                    })

            # Stream complete
            await manager.send_json(websocket, {
                "type": "stream_end",
                "message_id": message_id,
                "stress_update": analysis,
                "language": context.get("language", "en"),
                "mode": context.get("personality_mode", "companion"),
                "alerts": [],
            })

            # Update history
            history.append({"sender": "patient", "text": patient_text})
            history.append({"sender": "ai", "text": full_response})
            if len(history) > 30:
                history = history[-30:]

            # Save AI response (non-blocking)
            asyncio.create_task(_save_message(
                consultation_id, "ai", full_response, analysis,
            ))

            # Update context
            context["turn_count"] = context.get("turn_count", 0) + 1
            context["last_stress"] = analysis.get("overall_risk", 50)
            asyncio.create_task(_save_chat_context(consultation_id, context))

    except WebSocketDisconnect:
        logger.info("Consultation WS disconnected: consult_id=%s", consultation_id)
        await _save_chat_context(consultation_id, context)
    except Exception as e:
        logger.error("Consultation WS error: %s", e)
    finally:
        manager.disconnect(websocket, f"consult-{consultation_id}")


# ---------------------------------------------------------------------------
# PDF Export for Conversations
# ---------------------------------------------------------------------------

@router.get("/{consultation_id}/pdf")
async def export_conversation_pdf(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and return a PDF of the conversation."""
    import io

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF generation requires reportlab. Install with: pip install reportlab",
        )

    # Verify ownership
    result = await db.execute(
        select(Consultation).where(
            Consultation.id == consultation_id,
            Consultation.user_id == current_user.id,
        )
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Get messages
    msgs_result = await db.execute(
        select(ConsultationMessage)
        .where(ConsultationMessage.consultation_id == consultation_id)
        .order_by(ConsultationMessage.timestamp)
    )
    messages = msgs_result.scalars().all()

    # Get assessment
    assess_result = await db.execute(
        select(AssessmentResult).where(AssessmentResult.consultation_id == consultation_id)
    )
    assessment = assess_result.scalar_one_or_none()

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title2", parent=styles["Title"], fontSize=22,
        textColor=HexColor("#2c5282"), spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Sub", parent=styles["Normal"], fontSize=10,
        textColor=HexColor("#718096"), spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "H2", parent=styles["Heading2"], fontSize=14,
        textColor=HexColor("#2c5282"), spaceAfter=8, spaceBefore=16,
    )
    ai_style = ParagraphStyle(
        "AI", parent=styles["Normal"], fontSize=9,
        textColor=HexColor("#2c5282"), leading=13, spaceAfter=4,
        leftIndent=6, rightIndent=30, backColor=HexColor("#f0f4f8"),
    )
    patient_style = ParagraphStyle(
        "Patient", parent=styles["Normal"], fontSize=9,
        textColor=HexColor("#1a365d"), leading=13, spaceAfter=4,
        leftIndent=30, rightIndent=6, backColor=HexColor("#ebf8ff"),
    )
    footer_style = ParagraphStyle(
        "Footer", parent=styles["Normal"], fontSize=8,
        textColor=HexColor("#a0aec0"), alignment=1, spaceBefore=20,
    )

    elements = []
    elements.append(Paragraph("MindTrack — Conversation Export", title_style))

    # Date & duration
    date_str = ""
    if consultation.started_at:
        date_str = consultation.started_at.strftime("%B %d, %Y at %I:%M %p")
    dur = consultation.duration_seconds or 0
    dur_str = f"{dur // 60}m {dur % 60}s" if dur > 0 else "—"
    elements.append(Paragraph(f"Date: {date_str}  •  Duration: {dur_str}  •  Mode: {consultation.mode}", subtitle_style))
    elements.append(Spacer(1, 8))

    # Assessment
    if assessment:
        elements.append(Paragraph("Wellness Check-in", heading_style))
        elements.append(Paragraph(
            f"Mood: {assessment.phq9_score}/27 ({assessment.phq9_level})  •  "
            f"Worry: {assessment.gad7_score}/21 ({assessment.gad7_level})",
            subtitle_style,
        ))
        elements.append(Spacer(1, 4))

    # Messages
    elements.append(Paragraph("Conversation", heading_style))
    for msg in messages:
        time_str = msg.timestamp.strftime("%I:%M %p") if msg.timestamp else ""
        sender_label = "You" if msg.sender == "patient" else "Companion"
        text = (msg.message_text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        style = patient_style if msg.sender == "patient" else ai_style
        elements.append(Paragraph(f"<b>[{time_str}] {sender_label}:</b> {text}", style))

    # Footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph(
        "MindTrack is a wellness support tool, not a substitute for professional care. "
        "If you are in crisis, please call 988 or text HOME to 741741.",
        footer_style,
    ))

    doc.build(elements)
    buffer.seek(0)

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="mindtrack-conversation-{consultation_id[:8]}.pdf"'},
    )

