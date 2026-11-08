"""Tests for the AI engine module.

Uses mocked Groq client to test:
- build_mental_state_block with real model, demo, and no camera
- System prompt construction
- Fallback responses
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.ai_engine import (
    build_mental_state_block,
    build_system_prompt,
    detect_personality_mode,
    get_fallback_response,
    generate_live_response,
)


# ---------------------------------------------------------------------------
# build_mental_state_block tests
# ---------------------------------------------------------------------------

class TestBuildMentalStateBlock:
    def test_real_model_active(self) -> None:
        """Camera active + real model must contain 'LIVE BIOMETRIC ANALYSIS' and 'REAL MODEL ACTIVE'."""
        camera_data = {
            "active": True,
            "real_model": True,
            "stress": 55.0,
            "anxiety": 40.0,
            "stability": 65.0,
            "depression_risk": 20.0,
            "overall_risk": 45.0,
            "emotions": {"happy": 30.0, "neutral": 40.0, "sad": 10.0, "fear": 5.0, "angry": 5.0, "surprise": 5.0, "disgust": 5.0},
            "top_emotion": "neutral",
            "top_emotion_pct": 40.0,
            "confidence": 0.85,
            "face_detected": True,
        }
        result = build_mental_state_block(camera_data)
        assert "LIVE BIOMETRIC ANALYSIS" in result
        assert "REAL MODEL ACTIVE" in result
        assert "55" in result  # stress value
        assert "NEUTRAL" in result  # top emotion

    def test_demo_mode(self) -> None:
        """Camera active + demo mode must contain 'SIMULATED BIOMETRIC DATA'."""
        camera_data = {
            "active": True,
            "real_model": False,
            "stress": 35.0,
            "anxiety": 25.0,
            "stability": 70.0,
            "depression_risk": 15.0,
            "overall_risk": 30.0,
            "emotions": {"neutral": 50.0},
            "top_emotion": "neutral",
            "top_emotion_pct": 50.0,
            "confidence": 0.6,
            "face_detected": False,
        }
        result = build_mental_state_block(camera_data)
        assert "SIMULATED BIOMETRIC DATA" in result
        assert "demo mode" in result.lower()

    def test_no_camera(self) -> None:
        """No camera data must contain 'No biometric data available'."""
        result = build_mental_state_block(None)
        assert "No biometric data available" in result

    def test_camera_inactive(self) -> None:
        """Camera present but inactive."""
        result = build_mental_state_block({"active": False})
        assert "No biometric data available" in result

    def test_high_distress_instruction(self) -> None:
        """High distress must include crisis instruction."""
        camera_data = {
            "active": True,
            "real_model": True,
            "stress": 90.0,
            "anxiety": 88.0,
            "stability": 15.0,
            "depression_risk": 70.0,
            "overall_risk": 88.0,
            "emotions": {"fear": 40.0, "sad": 30.0, "angry": 15.0, "neutral": 5.0, "happy": 3.0, "surprise": 4.0, "disgust": 3.0},
            "top_emotion": "fear",
            "top_emotion_pct": 40.0,
            "confidence": 0.9,
            "face_detected": True,
        }
        result = build_mental_state_block(camera_data)
        assert "crisis" in result.lower() or "CRITICAL" in result


# ---------------------------------------------------------------------------
# System prompt construction tests
# ---------------------------------------------------------------------------

class TestSystemPrompt:
    def test_contains_user_name(self) -> None:
        context = {
            "user_name": "Devvrat",
            "personality_mode": "companion",
            "complexity_profile": "reflective",
            "last_stress": 50,
        }
        prompt = build_system_prompt(context)
        assert "Devvrat" in prompt

    def test_contains_complexity_profile(self) -> None:
        context = {
            "user_name": "",
            "personality_mode": "companion",
            "complexity_profile": "analytical",
            "last_stress": 50,
        }
        prompt = build_system_prompt(context)
        assert "analytical" in prompt.lower()

    def test_contains_crisis_instruction(self) -> None:
        context = {
            "user_name": "",
            "personality_mode": "companion",
            "complexity_profile": "reflective",
            "last_stress": 50,
        }
        prompt = build_system_prompt(context)
        assert "988" in prompt
        assert "741741" in prompt

    def test_contains_language_instruction(self) -> None:
        context = {
            "user_name": "",
            "personality_mode": "companion",
            "complexity_profile": "reflective",
            "last_stress": 50,
        }
        prompt = build_system_prompt(context)
        assert "language" in prompt.lower()

    def test_no_anthropic_references(self) -> None:
        """System prompt must not reference Anthropic or Claude."""
        context = {
            "user_name": "",
            "personality_mode": "companion",
            "complexity_profile": "reflective",
            "last_stress": 50,
        }
        prompt = build_system_prompt(context)
        assert "anthropic" not in prompt.lower()
        assert "claude" not in prompt.lower()
        assert "openai" not in prompt.lower()


# ---------------------------------------------------------------------------
# Personality mode detection
# ---------------------------------------------------------------------------

class TestPersonalityMode:
    def test_companion_trigger(self) -> None:
        assert detect_personality_mode("just listen to me", "coach") == "companion"

    def test_coach_trigger(self) -> None:
        assert detect_personality_mode("what should i do about this", "companion") == "coach"

    def test_mindfulness_trigger(self) -> None:
        assert detect_personality_mode("help me breathe", "companion") == "mindfulness"

    def test_night_trigger(self) -> None:
        assert detect_personality_mode("cant sleep again", "companion") == "night"

    def test_recovery_trigger(self) -> None:
        assert detect_personality_mode("i relapsed today", "companion") == "recovery"

    def test_clinical_trigger(self) -> None:
        assert detect_personality_mode("check in on me please", "companion") == "clinical"

    def test_no_trigger_keeps_current(self) -> None:
        assert detect_personality_mode("hello how are you", "coach") == "coach"


# ---------------------------------------------------------------------------
# Fallback responses
# ---------------------------------------------------------------------------

class TestFallbackResponses:
    def test_english_fallback(self) -> None:
        result = get_fallback_response("en", "error")
        assert len(result) > 0
        assert "💙" in result

    def test_hindi_fallback(self) -> None:
        result = get_fallback_response("hi", "error")
        assert len(result) > 0

    def test_unknown_language_defaults_to_english(self) -> None:
        result = get_fallback_response("xx", "error")
        assert len(result) > 0

    def test_busy_fallback(self) -> None:
        result = get_fallback_response("en", "busy")
        assert len(result) > 0


# ---------------------------------------------------------------------------
# Fallback on Groq exception
# ---------------------------------------------------------------------------

class TestGroqFallback:
    @pytest.mark.asyncio
    async def test_fallback_on_exception(self) -> None:
        """When Groq raises an exception, must return a non-empty fallback string."""
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(
            side_effect=Exception("Connection refused")
        )

        with patch("app.core.ai_engine._get_client", return_value=mock_client):
            result = await generate_live_response(
                user_message="hello",
                conversation_history=[],
                context={"personality_mode": "companion", "complexity_profile": "reflective", "last_stress": 50},
            )
            assert isinstance(result, str)
            assert len(result) > 0
