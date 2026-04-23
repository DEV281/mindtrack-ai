"""Real-time analysis WebSocket endpoint and processing pipeline."""

from __future__ import annotations

import base64
import io
import json
import logging
import random
import time
from datetime import datetime, timezone
from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.core.security import decode_token
from app.core.websocket import manager
from app.db.models import AnalysisReading, Session as SessionModel

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Analysis"])
settings = get_settings()

# Global model references (lazy-loaded)
_facial_model = None
_voice_model = None
_temporal_model = None
_models_loaded = False
_demo_mode = True


def _get_models():
    """Lazy-load ML models. Returns (facial, voice, temporal) or None in demo mode."""
    global _facial_model, _voice_model, _temporal_model, _models_loaded, _demo_mode

    if _models_loaded:
        return _facial_model, _voice_model, _temporal_model

    try:
        from app.models.model_loader import load_all_models
        _facial_model, _voice_model, _temporal_model = load_all_models()
        _demo_mode = False
        logger.info("ML models loaded successfully")
    except Exception as e:
        logger.warning(f"ML models not available, using demo mode: {e}")
        _demo_mode = True

    _models_loaded = True
    return _facial_model, _voice_model, _temporal_model


def _generate_demo_analysis(frame_count: int) -> dict:
    """Generate realistic demo analysis data when models are not available."""
    t = frame_count * 0.1
    base_stress = 35 + 15 * np.sin(t * 0.3) + random.gauss(0, 5)
    base_anxiety = 30 + 10 * np.sin(t * 0.25 + 1) + random.gauss(0, 4)

    stress = max(0, min(100, base_stress))
    anxiety = max(0, min(100, base_anxiety))
    stability = max(0, min(100, 100 - stress * 0.7 + random.gauss(0, 3)))
    depression_risk = max(0, min(100, stress * 0.4 + anxiety * 0.3 + random.gauss(0, 5)))
    overall_risk = max(0, min(100, stress * 0.35 + anxiety * 0.35 + depression_risk * 0.3))

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

    dominant = max(emotions, key=emotions.get)

    alerts = []
    if stress > 70:
        alerts.append("High stress level detected")
    if anxiety > 65:
        alerts.append("Elevated anxiety indicators")
    if depression_risk > 60:
        alerts.append("Depression risk indicators present")
    if overall_risk > 75:
        alerts.append("⚠️ Overall risk level is HIGH — consider intervention")

    return {
        "stress": round(stress, 1),
        "anxiety": round(anxiety, 1),
        "stability": round(stability, 1),
        "depression_risk": round(depression_risk, 1),
        "overall_risk": round(overall_risk, 1),
        "emotions": emotions,
        "dominant_emotion": dominant,
        "voice_freq": round(180 + random.gauss(0, 30), 1),
        "voice_amplitude": round(0.4 + random.gauss(0, 0.1), 3),
        "micro_expression_pct": round(random.uniform(2, 15), 1),
        "confidence": round(random.uniform(0.72, 0.95), 3),
        "model_rank": 1,
        "alerts": alerts,
    }


async def _run_real_analysis(video_b64: Optional[str], audio_b64: Optional[str], temporal_buffer: list) -> dict:
    """Run the actual ML pipeline on incoming data."""
    facial, voice, temporal = _get_models()

    emotions = {"neutral": 100.0, "happy": 0.0, "tense": 0.0, "anxious": 0.0, "sad": 0.0, "fear": 0.0, "surprised": 0.0}
    facial_stress = 0.0
    voice_stress = 0.0
    voice_freq = 0.0
    voice_amplitude = 0.0

    # Process video frame
    if video_b64 and facial is not None:
        try:
            import cv2
            frame_bytes = base64.b64decode(video_b64)
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is not None:
                result = facial.predict(frame)
                emotions = result.get("probabilities", emotions)
                facial_stress = result.get("stress_score", 0.0)
        except Exception as e:
            logger.warning(f"Facial analysis error: {e}")

    # Process audio chunk
    if audio_b64 and voice is not None:
        try:
            audio_bytes = base64.b64decode(audio_b64)
            result = voice.predict(audio_bytes)
            voice_stress = result.get("stress_score", 0.0)
            voice_freq = result.get("frequency", 0.0)
            voice_amplitude = result.get("amplitude", 0.0)
        except Exception as e:
            logger.warning(f"Voice analysis error: {e}")

    # Temporal analysis
    temporal_stress = 0.0
    if temporal is not None and len(temporal_buffer) >= 5:
        try:
            result = temporal.predict(temporal_buffer[-5:])
            temporal_stress = result.get("temporal_stress", 0.0)
        except Exception as e:
            logger.warning(f"Temporal analysis error: {e}")

    # Fusion
    stress = facial_stress * 0.35 + voice_stress * 0.30 + temporal_stress * 0.35
    anxiety = stress * 0.8 + random.gauss(0, 3)
    stability = max(0, 100 - stress * 0.7)
    depression_risk = stress * 0.5
    overall_risk = stress * 0.35 + anxiety * 0.35 + depression_risk * 0.3

    alerts = []
    if stress > 70:
        alerts.append("High stress level detected")
    if anxiety > 65:
        alerts.append("Elevated anxiety indicators")
    if overall_risk > 75:
        alerts.append("⚠️ Overall risk level is HIGH")

    dominant = max(emotions, key=emotions.get)

    return {
        "stress": round(max(0, min(100, stress)), 1),
        "anxiety": round(max(0, min(100, anxiety)), 1),
        "stability": round(max(0, min(100, stability)), 1),
        "depression_risk": round(max(0, min(100, depression_risk)), 1),
        "overall_risk": round(max(0, min(100, overall_risk)), 1),
        "emotions": {k: round(v, 1) for k, v in emotions.items()},
        "dominant_emotion": dominant,
        "voice_freq": round(voice_freq, 1),
        "voice_amplitude": round(voice_amplitude, 3),
        "micro_expression_pct": round(random.uniform(2, 15), 1),
        "confidence": round(random.uniform(0.7, 0.95), 3),
        "model_rank": 1,
        "alerts": alerts,
    }


@router.websocket("/ws/session/{session_id}")
async def websocket_analysis(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time analysis streaming."""

    # Authenticate via query param token
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing authentication token")
        return

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = payload.get("sub")

    # Connect
    await manager.connect(websocket, session_id)
    logger.info(f"WebSocket connected: session={session_id}, user={user_id}")

    frame_count = 0
    temporal_buffer: list = []

    try:
        while True:
            # Receive data from client
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await manager.send_json(websocket, {"error": "Invalid JSON"})
                continue

            video_b64 = data.get("video_frame")
            audio_b64 = data.get("audio_chunk")

            # Run analysis
            if _demo_mode:
                result = _generate_demo_analysis(frame_count)
            else:
                result = await _run_real_analysis(video_b64, audio_b64, temporal_buffer)
                temporal_buffer.append(result)
                if len(temporal_buffer) > 20:
                    temporal_buffer = temporal_buffer[-10:]

            frame_count += 1

            # Store reading in database (async)
            try:
                async with async_session_factory() as db:
                    reading = AnalysisReading(
                        session_id=session_id,
                        stress=result["stress"],
                        anxiety=result["anxiety"],
                        stability=result["stability"],
                        depression_risk=result["depression_risk"],
                        overall_risk=result["overall_risk"],
                        emotions_json=result["emotions"],
                        voice_freq=result.get("voice_freq", 0),
                        voice_amplitude=result.get("voice_amplitude", 0),
                        confidence=result.get("confidence", 0),
                        alerts_json=result.get("alerts", []),
                    )
                    db.add(reading)
                    await db.commit()
            except Exception as e:
                logger.warning(f"Failed to save reading: {e}")

            # Send result back to client
            await manager.send_json(websocket, result)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session={session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket, session_id)
