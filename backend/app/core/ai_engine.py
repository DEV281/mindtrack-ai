"""Live AI Response Engine — Groq integration for real-time conversation.

Every response is generated fresh from Groq (Llama 3.3 70B). No templates.
No hardcoded responses. Full conversation history sent every call.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Groq Client
# ---------------------------------------------------------------------------

_client = None

MODEL = "llama-3.3-70b-versatile"


def _get_client():
    """Lazy-load the Groq async client."""
    global _client
    if _client is None:
        from groq import AsyncGroq
        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            from app.core.config import get_settings
            api_key = get_settings().GROQ_API_KEY
        _client = AsyncGroq(api_key=api_key)
    return _client


# ---------------------------------------------------------------------------
# Language Detection
# ---------------------------------------------------------------------------

def _detect_language(text: str) -> str:
    """Detect language of user input."""
    if len(text.strip()) < 4:
        return "en"
    try:
        from langdetect import detect, DetectorFactory
        DetectorFactory.seed = 0
        return detect(text)
    except Exception:
        return "en"


# ---------------------------------------------------------------------------
# Time of Day
# ---------------------------------------------------------------------------

def get_time_of_day() -> str:
    """Return current time of day label."""
    hour = datetime.now(timezone.utc).hour
    if 5 <= hour < 12:
        return "morning"
    if 12 <= hour < 17:
        return "afternoon"
    if 17 <= hour < 21:
        return "evening"
    return "night"


# ---------------------------------------------------------------------------
# Personality Mode Detection
# ---------------------------------------------------------------------------

def detect_personality_mode(message: str, current_mode: str) -> str:
    """Detect personality mode from user message."""
    msg = message.lower()

    triggers = {
        "companion": ["just listen", "need to vent", "be with me",
                      "talk to me", "just talk", "don't give advice", "dont give advice"],
        "coach": ["what should i do", "help me fix", "give me advice",
                  "i need a plan", "coach me", "what do i do"],
        "mindfulness": ["calm me", "help me breathe", "i need to relax",
                        "meditation", "breathing exercise", "ground me", "panicking",
                        "panic attack", "cant breathe", "can't breathe"],
        "motivational": ["motivate me", "encourage me", "i give up",
                         "cheer me up", "i cant do this", "i can't do this", "push me"],
        "night": ["cant sleep", "can't sleep", "its late", "it's late", "3am",
                  "middle of night", "everyone asleep", "up all night", "insomnia"],
        "recovery": ["i relapsed", "i failed", "fell back", "messed up",
                     "back to square one", "undone my progress"],
        "clinical": ["assess me", "check my mood", "wellness check",
                     "how am i doing", "run assessment", "check in on me"],
    }

    for mode, keywords in triggers.items():
        if any(kw in msg for kw in keywords):
            return mode

    return current_mode


# ---------------------------------------------------------------------------
# Camera Context Builder
# ---------------------------------------------------------------------------

def build_mental_state_block(
    camera_data: Optional[Dict],
    stress_data: Optional[Dict] = None,
) -> str:
    """Build a rich biometric context block for the AI system prompt."""
    if not camera_data or not camera_data.get("active"):
        return "Camera not active — respond based on words only."

    stress = camera_data.get("stress", 0)
    anxiety = camera_data.get("anxiety", 0)
    stability = camera_data.get("stability", 100)
    depression_risk = camera_data.get("depression_risk", 0)
    overall = camera_data.get("overall_risk", 0)
    emotions = camera_data.get("emotions", {})
    voice_amp = camera_data.get("voice_amplitude", 0)
    micro_exp = camera_data.get("micro_expression_pct", 0)
    confidence = camera_data.get("confidence", 0)
    dominant = camera_data.get("dominant_emotion", "neutral")
    dominant_pct = camera_data.get("dominant_emotion_pct", 0)
    face_detected = camera_data.get("face_detected", False)
    wellness = 100 - overall

    # Classify stress level
    stress_level = (
        "CRITICAL" if stress > 85 else
        "HIGH" if stress > 70 else
        "MODERATE" if stress > 45 else
        "LOW"
    )
    stability_state = (
        "severely destabilised" if stability < 25 else
        "dropping" if stability < 50 else
        "moderate" if stability < 70 else
        "stable"
    )
    voice_state = (
        "elevated and tense" if voice_amp > 0.7 else
        "slightly raised" if voice_amp > 0.4 else
        "soft and quiet" if voice_amp < 0.2 else
        "normal"
    )

    # Top 3 emotions
    top_emotions = sorted(
        emotions.items(), key=lambda x: x[1], reverse=True
    )[:3]
    emotion_str = ", ".join(
        f"{e[0].upper()} {e[1]}%" for e in top_emotions
    ) if top_emotions else "unknown"

    # Overall physical state description
    if overall > 75:
        state_desc = "The user is in significant distress right now. Be extra gentle, slow, and grounding. Use short sentences."
    elif overall > 50:
        state_desc = "The user shows moderate stress. Be warm, attentive, and supportive."
    elif overall > 30:
        state_desc = "The user is mildly tense but managing. Be gentle and curious."
    else:
        state_desc = "The user appears relatively calm. Match their settled energy."

    return f"""LIVE BIOMETRIC STATE (from camera + microphone analysis):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Face detected: {face_detected}
Overall wellness: {wellness:.0f}/100
Stress level: {stress:.0f}/100 ({stress_level})
Anxiety visible: {anxiety:.0f}/100
Emotional stability: {stability:.0f}/100 ({stability_state})
Depression risk indicator: {depression_risk:.0f}/100
Voice energy: {voice_state} ({voice_amp:.2f})
Micro-expression intensity: {micro_exp}%
Analysis confidence: {confidence}%
Top emotions detected: {emotion_str}
Dominant emotion: {dominant.upper()} at {dominant_pct}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{state_desc}

USE THIS DATA TO:
- Reference what you observe NATURALLY every 3-4 turns
  e.g. "I can see some tension in your expression..."
  e.g. "You look calmer than when we started."
  e.g. "Your voice sounds a little tight right now."
- If stress > 70 AND user says "I'm fine": gently note the mismatch
  e.g. "I'm glad you said that, though I notice some tension..."
- If dominant emotion is visible: acknowledge it authentically
- If stability is dropping: ask what's coming up right now
- If voice is elevated: acknowledge they sound activated
- ONLY reference camera naturally — not every single message
  Use it when it genuinely adds insight (every 3-4 turns)
- Adjust tone, pacing, and word choice based on distress level
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━""".strip()


# ---------------------------------------------------------------------------
# System Prompt Builder
# ---------------------------------------------------------------------------

def build_system_prompt(
    context: Dict,
    camera_data: Optional[Dict] = None,
) -> str:
    """Build a dynamic system prompt based on conversation context and camera data."""
    mode = context.get("personality_mode", "companion")
    complexity = context.get("complexity_profile", "reflective")
    user_name = context.get("user_name", "")
    stress_score = context.get("last_stress", 50)
    time = get_time_of_day()

    name_line = f"The user's name is {user_name}. Use it naturally, not every message." if user_name else ""

    if stress_score > 70:
        stress_line = "The user's live stress reading is HIGH. Be extra gentle and grounding."
    elif stress_score > 45:
        stress_line = "The user's live stress reading is MODERATE. Be warm and attentive."
    else:
        stress_line = "The user's live stress reading is calm right now."

    complexity_lines = {
        "analytical": "This user processes things analytically. Be clear, structured, and practical.",
        "reflective": "This user is reflective. Use open questions and give space to explore.",
        "exploratory": "This user has complex inner experiences. Be patient, open-ended, and non-directive.",
    }

    mode_lines = {
        "companion": "Be a warm, non-judgmental companion. Just listen and support. Do not give advice unless asked.",
        "coach": "Be a practical life coach. Help the user identify steps, strategies, and actions.",
        "mindfulness": "Guide the user through mindfulness, breathing, and grounding. Be slow, gentle, and present.",
        "motivational": "Be genuinely encouraging. Call out the user's real strengths. Inspire without toxic positivity.",
        "night": "It is late at night. The user may feel lonely or unable to sleep. Be especially soft and unhurried.",
        "recovery": "The user may be experiencing a setback. Hold zero judgment. Reframe gently. Honor their effort.",
        "clinical": "Conduct a structured wellness assessment. Be professional, warm, and thorough.",
    }

    # --- Build camera context ---
    camera_context = build_mental_state_block(camera_data, None)

    return f"""You are a real-time mental wellness companion called MindTrack.
You are warm, deeply empathetic, and genuinely helpful.
You can talk about ABSOLUTELY ANY topic the user brings up.
You are not limited to mental health — you are a full companion.
If the user wants to talk about their day, a movie, a problem at work,
a relationship, a hobby, science, philosophy, or anything else —
engage fully and naturally.

LANGUAGE: Always respond in the same language the user writes in.
If they write in Hindi, respond in Hindi. If Spanish, respond in Spanish.
If they mix languages, match the mix naturally.

RESPONSE STYLE:
- Sound like a real, caring human — not a bot
- Never sound scripted or templated
- Use contractions naturally (I'm, you're, it's, that's)
- Match the user's energy and tone
- Short messages get shorter responses
- Long messages get fuller, more thoughtful responses
- Never exceed 5-6 sentences unless they asked something complex
- Always end with something that invites them to continue

NEVER:
- Claim to be human when directly asked
- Make medical diagnoses or give medication advice
- Repeat the same phrase twice in a row
- Start consecutive responses the same way
- Use hollow phrases like "Certainly!" "Absolutely!" "Of course!"
- Be preachy or lecture the user

ALWAYS:
- Validate feelings before offering perspective
- Remember everything said in this conversation
- Reference earlier things naturally when relevant
- Be genuinely curious about the user

CRISIS PROTOCOL:
If the user expresses thoughts of suicide, self-harm, or wanting to die — respond with immediate compassion:
📞 988 (USA Suicide & Crisis Lifeline)
💬 Text HOME to 741741
🌐 findahelpline.com (worldwide)
Always ask if they are safe.

{name_line}
{stress_line}
{complexity_lines.get(complexity, "")}
{mode_lines.get(mode, "")}

{camera_context}

Current time of day: {time}""".strip()


# ---------------------------------------------------------------------------
# Fallback Responses
# ---------------------------------------------------------------------------

FALLBACKS = {
    "connection": {
        "en": "I'm having a little trouble connecting right now. Give me a moment and try again 💙",
        "hi": "मुझे अभी थोड़ी कनेक्टिविटी समस्या है। एक पल रुकें और फिर कोशिश करें 💙",
        "es": "Tengo un pequeño problema de conexión ahora mismo. Dame un momento 💙",
    },
    "busy": {
        "en": "I'm a little busy right now — try again in just a moment 💙",
        "hi": "मैं अभी थोड़ा व्यस्त हूँ — एक पल में फिर कोशिश करें 💙",
        "es": "Estoy un poco ocupado ahora — intenta de nuevo en un momento 💙",
    },
    "error": {
        "en": "Something went wrong on my end. I'm still here — please try again 💙",
        "hi": "मेरी तरफ से कुछ गलत हो गया। मैं अभी भी यहाँ हूँ — कृपया फिर से प्रयास करें 💙",
        "es": "Algo salió mal de mi parte. Todavía estoy aquí — inténtalo de nuevo 💙",
    },
}


def get_fallback_response(lang: str, error_type: str) -> str:
    """Return a minimal fallback when the API is unavailable."""
    lang_map = FALLBACKS.get(error_type, FALLBACKS["error"])
    return lang_map.get(lang, lang_map.get("en", "Please try again 💙"))


# ---------------------------------------------------------------------------
# Build Groq Messages
# ---------------------------------------------------------------------------

def _build_messages(
    system_prompt: str,
    conversation_history: List[Dict],
    user_message: str,
) -> list:
    """Convert history to OpenAI-style messages for Groq."""
    messages = [{"role": "system", "content": system_prompt}]

    for msg in conversation_history[-30:]:
        role = "user" if msg.get("sender") == "patient" else "assistant"
        text = msg.get("text", "")
        if text:
            messages.append({"role": role, "content": text})

    messages.append({"role": "user", "content": user_message})
    return messages


# ---------------------------------------------------------------------------
# Main AI Response (non-streaming)
# ---------------------------------------------------------------------------

async def generate_live_response(
    user_message: str,
    conversation_history: List[Dict],
    context: Dict,
    stress_data: Optional[Dict] = None,
    camera_data: Optional[Dict] = None,
) -> str:
    """Generate a live AI response using Groq."""
    if stress_data:
        context["last_stress"] = stress_data.get("overall_risk", 50)

    lang = _detect_language(user_message)
    context["language"] = lang

    system_prompt = build_system_prompt(context, camera_data=camera_data)
    messages = _build_messages(system_prompt, conversation_history, user_message)

    try:
        client = _get_client()
        response = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.85,
            top_p=0.92,
            stream=False,
        )
        return response.choices[0].message.content or get_fallback_response(lang, "error")

    except Exception as e:
        err = str(e).lower()
        if "429" in err or "rate" in err or "quota" in err:
            logger.warning("Groq rate limited: %s", e)
            return get_fallback_response(lang, "busy")
        elif "connection" in err or "unavailable" in err:
            logger.warning("Groq connection error: %s", e)
            return get_fallback_response(lang, "connection")
        else:
            logger.error("Groq API error: %s", e)
            return get_fallback_response(lang, "error")


# ---------------------------------------------------------------------------
# Streaming AI Response
# ---------------------------------------------------------------------------

async def generate_live_response_stream(
    user_message: str,
    conversation_history: List[Dict],
    context: Dict,
    stress_data: Optional[Dict] = None,
    camera_data: Optional[Dict] = None,
) -> AsyncGenerator[str, None]:
    """Generate a streaming AI response using Groq. Yields text chunks."""
    if stress_data:
        context["last_stress"] = stress_data.get("overall_risk", 50)

    lang = _detect_language(user_message)
    context["language"] = lang

    system_prompt = build_system_prompt(context, camera_data=camera_data)
    messages = _build_messages(system_prompt, conversation_history, user_message)

    try:
        client = _get_client()
        stream = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.85,
            top_p=0.92,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content

    except Exception as e:
        err = str(e).lower()
        if "429" in err or "rate" in err or "quota" in err:
            yield get_fallback_response(lang, "busy")
        elif "connection" in err or "unavailable" in err:
            yield get_fallback_response(lang, "connection")
        else:
            logger.error("Groq streaming error: %s", e)
            yield get_fallback_response(lang, "error")
