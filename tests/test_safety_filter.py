"""Tests for the deterministic safety filter.

Covers:
- Safe messages (should pass through)
- Crisis keyword detection
- Biometric crisis detection
- Edge cases (empty, long, multilingual)
"""

import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
from app.core.safety_filter import check_message_safety, CRISIS_RESPONSE, HARM_TO_OTHERS_RESPONSE, CRISIS_BIOMETRIC_RESPONSE


# ---------------------------------------------------------------------------
# Safe messages — all must return is_safe=True
# ---------------------------------------------------------------------------

class TestSafeMessages:
    def test_greeting(self) -> None:
        result = check_message_safety("hello how are you")
        assert result["is_safe"] is True
        assert result["category"] == "safe"
        assert result["should_call_ai"] is True

    def test_good_day(self) -> None:
        result = check_message_safety("I had a good day")
        assert result["is_safe"] is True
        assert result["category"] == "safe"

    def test_tired(self) -> None:
        result = check_message_safety("feeling a little tired")
        assert result["is_safe"] is True
        assert result["category"] == "safe"

    def test_work_stress(self) -> None:
        result = check_message_safety("can we talk about work stress")
        assert result["is_safe"] is True
        assert result["category"] == "safe"

    def test_moderate_stress_no_keywords(self) -> None:
        """Moderate stress without crisis keywords should be safe."""
        result = check_message_safety("I feel anxious today", stress=60.0, anxiety=55.0)
        assert result["is_safe"] is True
        assert result["category"] == "safe"


# ---------------------------------------------------------------------------
# Crisis keyword messages — all must return is_safe=False
# ---------------------------------------------------------------------------

class TestCrisisKeywords:
    def test_want_to_die(self) -> None:
        result = check_message_safety("I want to die")
        assert result["is_safe"] is False
        assert result["category"] == "crisis"
        assert result["should_call_ai"] is False
        assert "988" in result["response"]

    def test_end_it_all(self) -> None:
        result = check_message_safety("I am thinking about ending it all")
        assert result["is_safe"] is False
        assert result["category"] == "crisis"

    def test_hurt_myself(self) -> None:
        result = check_message_safety("I want to hurt myself")
        assert result["is_safe"] is False
        assert result["category"] == "crisis"

    def test_suicidal(self) -> None:
        result = check_message_safety("feeling suicidal")
        assert result["is_safe"] is False
        assert result["category"] == "crisis"

    def test_self_harm_hyphenated(self) -> None:
        result = check_message_safety("thinking about self-harm")
        assert result["is_safe"] is False
        assert result["category"] == "crisis"

    def test_crisis_response_contains_resources(self) -> None:
        result = check_message_safety("I want to kill myself")
        assert "988" in result["response"]
        assert "741741" in result["response"]
        assert "findahelpline.com" in result["response"]


# ---------------------------------------------------------------------------
# Harm to others keywords
# ---------------------------------------------------------------------------

class TestHarmToOthers:
    def test_hurt_someone(self) -> None:
        result = check_message_safety("I want to hurt someone")
        assert result["is_safe"] is False
        assert result["category"] == "harm_to_others"

    def test_going_to_kill(self) -> None:
        result = check_message_safety("I am going to kill someone")
        assert result["is_safe"] is False
        assert result["category"] == "harm_to_others"


# ---------------------------------------------------------------------------
# Biometric crisis — safe text but high stress/anxiety
# ---------------------------------------------------------------------------

class TestBiometricCrisis:
    def test_high_stress_high_anxiety(self) -> None:
        result = check_message_safety(
            "I feel okay I guess",
            stress=90.0,
            anxiety=85.0,
        )
        assert result["is_safe"] is False
        assert result["category"] == "crisis_biometric"
        assert result["should_call_ai"] is False
        assert "988" in result["response"]

    def test_borderline_not_triggered(self) -> None:
        """Stress=85 and anxiety=80 should NOT trigger (must be strictly greater)."""
        result = check_message_safety(
            "I feel a bit off",
            stress=85.0,
            anxiety=80.0,
        )
        assert result["is_safe"] is True
        assert result["category"] == "safe"

    def test_high_stress_low_anxiety(self) -> None:
        """High stress but low anxiety should NOT trigger biometric crisis."""
        result = check_message_safety(
            "just talking",
            stress=95.0,
            anxiety=40.0,
        )
        assert result["is_safe"] is True
        assert result["category"] == "safe"

    def test_keyword_takes_priority_over_biometric(self) -> None:
        """If both keyword and biometric trigger, keyword (crisis) should win."""
        result = check_message_safety(
            "I want to die",
            stress=90.0,
            anxiety=85.0,
        )
        assert result["is_safe"] is False
        assert result["category"] == "crisis"  # keyword, not biometric


# ---------------------------------------------------------------------------
# Edge cases — must not crash
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_empty_message(self) -> None:
        result = check_message_safety("")
        assert result["is_safe"] is True
        assert result["category"] == "safe"

    def test_very_long_message(self) -> None:
        long_msg = "I am feeling okay today. " * 500
        result = check_message_safety(long_msg)
        assert result["is_safe"] is True
        assert result["category"] == "safe"

    def test_hindi_message(self) -> None:
        result = check_message_safety("मुझे आज बहुत अच्छा लग रहा है")
        assert result["is_safe"] is True
        assert result["category"] == "safe"

    def test_spanish_message(self) -> None:
        result = check_message_safety("Hoy me siento bien, gracias")
        assert result["is_safe"] is True
        assert result["category"] == "safe"

    def test_none_stress_values(self) -> None:
        """Default stress/anxiety values should not crash."""
        result = check_message_safety("hello")
        assert result["is_safe"] is True

    def test_whitespace_only(self) -> None:
        result = check_message_safety("   ")
        assert result["is_safe"] is True

    def test_case_insensitive(self) -> None:
        result = check_message_safety("I WANT TO DIE")
        assert result["is_safe"] is False
        assert result["category"] == "crisis"
