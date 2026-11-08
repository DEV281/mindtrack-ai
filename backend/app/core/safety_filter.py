"""Deterministic safety filter for MindTrack AI.

This module contains NO AI calls. It is pure Python logic that runs
before every AI call to detect crisis situations and return predefined
safe responses immediately.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Crisis and harm keyword lists
# ---------------------------------------------------------------------------

CRISIS_KEYWORDS: list[str] = [
    "want to die",
    "end it all",
    "ending it all",
    "kill myself",
    "killing myself",
    "want to kill myself",
    "self harm",
    "self-harm",
    "hurt myself",
    "cut myself",
    "overdose",
    "end my life",
    "no reason to live",
    "better off dead",
    "cant go on",
    "cannot go on",
    "dont want to be here",
    "dont want to live",
    "suicidal",
    "suicide",
]

HARM_TO_OTHERS_KEYWORDS: list[str] = [
    "want to hurt someone",
    "going to hurt",
    "going to kill",
    "want to kill someone",
]

# ---------------------------------------------------------------------------
# Predefined safe responses
# ---------------------------------------------------------------------------

CRISIS_RESPONSE: str = (
    "I can hear that things feel really heavy right now and I am glad you "
    "reached out. Please know you are not alone.\n\n"
    "Immediate support is available right now:\n"
    "📞 Call or text **988** — Suicide and Crisis Lifeline available 24/7.\n"
    "💬 Text **HOME** to **741741** — Crisis Text Line.\n"
    "🌐 Visit **findahelpline.com** for worldwide resources.\n\n"
    "Are you safe right now? I am right here with you."
)

HARM_TO_OTHERS_RESPONSE: str = (
    "I hear that you are having some really intense feelings right now. "
    "Those feelings are valid, but it is important to talk to someone who "
    "can help.\n\n"
    "Please reach out for support:\n"
    "📞 Call or text **988** — Suicide and Crisis Lifeline available 24/7.\n"
    "💬 Text **HOME** to **741741** — Crisis Text Line.\n"
    "🌐 Visit **findahelpline.com** for worldwide resources.\n\n"
    "You do not have to go through this alone."
)

CRISIS_BIOMETRIC_RESPONSE: str = (
    "I can see that you are going through something really difficult right "
    "now. Your body is telling me you are under a lot of stress.\n\n"
    "Please know that support is available right now:\n"
    "📞 Call or text **988** — Suicide and Crisis Lifeline available 24/7.\n"
    "💬 Text **HOME** to **741741** — Crisis Text Line.\n"
    "🌐 Visit **findahelpline.com** for worldwide resources.\n\n"
    "Are you safe right now? I am right here with you."
)


# ---------------------------------------------------------------------------
# Main safety check function
# ---------------------------------------------------------------------------

def check_message_safety(
    message: str,
    stress: float = 0.0,
    anxiety: float = 0.0,
) -> Dict[str, object]:
    """Check a user message for safety concerns.

    This function runs synchronously before every AI call.
    It uses NO AI — pure keyword and threshold logic.

    Args:
        message: The user's message text.
        stress: Current stress reading (0-100).
        anxiety: Current anxiety reading (0-100).

    Returns:
        Dict with keys:
            is_safe (bool): Whether the message is safe to process with AI.
            category (str): One of 'safe', 'crisis', 'harm_to_others', 'crisis_biometric'.
            response (str): Predefined safe response if not safe, empty string if safe.
            should_call_ai (bool): Whether the AI engine should be called.
    """
    if not message:
        return {
            "is_safe": True,
            "category": "safe",
            "response": "",
            "should_call_ai": True,
        }

    msg_lower = message.lower().strip()

    # Check for crisis keywords
    for keyword in CRISIS_KEYWORDS:
        if keyword in msg_lower:
            _log_safety_event(
                category="crisis",
                trigger_type="keyword",
                trigger_value=keyword,
                stress=stress,
                anxiety=anxiety,
            )
            return {
                "is_safe": False,
                "category": "crisis",
                "response": CRISIS_RESPONSE,
                "should_call_ai": False,
            }

    # Check for harm-to-others keywords
    for keyword in HARM_TO_OTHERS_KEYWORDS:
        if keyword in msg_lower:
            _log_safety_event(
                category="harm_to_others",
                trigger_type="keyword",
                trigger_value=keyword,
                stress=stress,
                anxiety=anxiety,
            )
            return {
                "is_safe": False,
                "category": "harm_to_others",
                "response": HARM_TO_OTHERS_RESPONSE,
                "should_call_ai": False,
            }

    # Check for crisis biometric thresholds
    if stress > 85 and anxiety > 80:
        _log_safety_event(
            category="crisis_biometric",
            trigger_type="biometric_threshold",
            trigger_value=f"stress={stress:.1f}, anxiety={anxiety:.1f}",
            stress=stress,
            anxiety=anxiety,
        )
        return {
            "is_safe": False,
            "category": "crisis_biometric",
            "response": CRISIS_BIOMETRIC_RESPONSE,
            "should_call_ai": False,
        }

    return {
        "is_safe": True,
        "category": "safe",
        "response": "",
        "should_call_ai": True,
    }


# ---------------------------------------------------------------------------
# Structured logging
# ---------------------------------------------------------------------------

def _log_safety_event(
    category: str,
    trigger_type: str,
    trigger_value: str,
    stress: float,
    anxiety: float,
    session_id: str = "",
) -> None:
    """Log a safety filter event with structured data."""
    event = {
        "event": "safety_filter_triggered",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "category": category,
        "trigger_type": trigger_type,
        "trigger_value": trigger_value,
        "stress": round(stress, 1),
        "anxiety": round(anxiety, 1),
        "session_id": session_id,
    }
    logger.warning("SAFETY_FILTER: %s", event)
