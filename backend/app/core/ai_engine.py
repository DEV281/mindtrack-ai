"""Live AI Response Engine — Groq-only integration for real-time conversation.

Every response is generated fresh from Groq (Llama 3.3 70B). No templates.
No hardcoded responses. Full conversation history sent every call.

GROQ ONLY — No Anthropic. No OpenAI. No other AI provider.
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
    """Detect personality mode from user message keywords."""
    msg = message.lower()

    triggers = {
        "companion": ["just listen", "need to vent", "be with me",
                      "talk to me", "just talk", "don't give advice", "dont give advice"],
        "coach": ["what should i do", "help me fix", "give me advice",
                  "i need a plan", "coach me", "what do i do", "need a plan"],
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
# Mental State Block Builder
# ---------------------------------------------------------------------------

def build_mental_state_block(
    camera_data: Optional[Dict] = None,
    stress_data: Optional[Dict] = None,
) -> str:
    """Build a rich biometric context block for the AI system prompt.

    Three modes:
    1. Camera active + real model → full LIVE BIOMETRIC ANALYSIS block
    2. Camera active + demo mode → SIMULATED BIOMETRIC DATA block
    3. No camera → plain text fallback
    """
    if not camera_data or not camera_data.get("active"):
        return "No biometric data available. Respond based on words only."

    # Extract readings
    stress = camera_data.get("stress", 0)
    anxiety = camera_data.get("anxiety", 0)
    stability = camera_data.get("stability", 100)
    depression_risk = camera_data.get("depression_risk", 0)
    overall = camera_data.get("overall_risk", 0)
    emotions = camera_data.get("emotions", {})
    confidence = camera_data.get("confidence", 0)
    top_emotion = camera_data.get("top_emotion", camera_data.get("dominant_emotion", "neutral"))
    top_pct = camera_data.get("top_emotion_pct", camera_data.get("dominant_emotion_pct", 0))
    face_detected = camera_data.get("face_detected", False)
    real_model = camera_data.get("real_model", False)

    # Classify stress level
    stress_level = (
        "CRITICAL" if stress > 85 else
        "HIGH" if stress > 70 else
        "MODERATE" if stress > 45 else
        "LOW" if stress > 20 else
        "MINIMAL"
    )

    # Stability trend
    stability_state = (
        "DROPPING" if stability < 40 else
        "STABLE" if stability < 70 else
        "RISING"
    )

    # Build emotion distribution string
    emotion_str = " ".join(
        f"{k}:{v}%" for k, v in sorted(emotions.items(), key=lambda x: -x[1])
    ) if emotions else "unknown"

    if real_model:
        # --- Real model active ---
        # Determine behavioral instruction
        if overall > 85:
            instruction = (
                "INSTRUCTION: This is real biometric data from a trained ViT model "
                "reading the user's face right now. Overall distress is CRITICAL. "
                "Output crisis resources first. Be slower, softer, more grounding. "
                "Use short sentences. Ask if they are safe."
            )
        elif overall > 70:
            instruction = (
                "INSTRUCTION: This is real biometric data from a trained ViT model "
                "reading the user's face right now. Distress is high. Be extra gentle, "
                "slow, and grounding. Use short sentences."
            )
        elif overall > 30:
            instruction = (
                "INSTRUCTION: This is real biometric data from a trained ViT model "
                "reading the user's face right now. Adjust your entire response based "
                "on this. Be warm and attentive."
            )
        else:
            instruction = (
                "INSTRUCTION: This is real biometric data from a trained ViT model "
                "reading the user's face right now. Match their calm energy."
            )

        return (
            f"LIVE BIOMETRIC ANALYSIS — REAL MODEL ACTIVE:\n"
            f"Facial emotion: {top_emotion.upper()} at {top_pct:.0f}% confidence\n"
            f"Stress level: {stress:.0f}/100 — classified as {stress_level}\n"
            f"Anxiety indicators: {anxiety:.0f}/100\n"
            f"Emotional stability: {stability:.0f}/100 — {stability_state}\n"
            f"Depression risk signal: {depression_risk:.0f}/100\n"
            f"Full emotion distribution: {emotion_str}\n"
            f"Overall distress score: {overall:.0f}/100\n"
            f"Model confidence: {confidence:.3f} — face_detected: {face_detected}\n"
            f"{instruction}"
        )
    else:
        # --- Demo mode ---
        return (
            f"SIMULATED BIOMETRIC DATA — demo mode active. "
            f"Treat as approximate context only. "
            f"{stress:.0f}/100 overall distress. "
            f"Top emotion: {top_emotion.upper()}. "
            f"Do not reference specific numbers as if they are precise measurements."
        )


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
    time_of_day = get_time_of_day()

    # Name instruction
    name_line = f"The user's name is {user_name}. Use it naturally, not every message." if user_name else ""

    # Complexity profile
    complexity_lines = {
        "analytical": "This user processes things analytically. Be clear, structured, and practical.",
        "reflective": "This user is reflective. Use open questions and give space to explore.",
        "exploratory": "This user has complex inner experiences. Be patient, open-ended, and non-directive.",
    }

    # Personality mode instructions
    mode_lines = {
        "companion": (
            "MODE: COMPANION — Be a warm, non-judgmental companion. Just listen and support. "
            "Do not give advice unless explicitly asked. Validate feelings. Hold space."
        ),
        "coach": (
            "MODE: COACH — Be a practical life coach. Help the user identify clear steps, "
            "strategies, and actions. Be direct but warm. Give concrete guidance."
        ),
        "mindfulness": (
            "MODE: MINDFULNESS — Guide the user through breathing, grounding, and present-moment "
            "awareness. Be slow, gentle, and present. Use short calming sentences. "
            "Offer a breathing exercise if appropriate."
        ),
        "motivational": (
            "MODE: MOTIVATIONAL — Be genuinely encouraging. Call out the user's real strengths "
            "and progress. Inspire without toxic positivity. Reference their actual situation."
        ),
        "night": (
            "MODE: NIGHT — It is late at night. The user may feel lonely, anxious, or unable to sleep. "
            "Be especially soft, quiet, and unhurried. Acknowledge the loneliness of late hours."
        ),
        "recovery": (
            "MODE: RECOVERY — The user may be experiencing a setback or relapse. "
            "Hold zero judgment. Reframe gently. Honor every effort they have made. "
            "Remind them that setbacks are part of growth."
        ),
        "clinical": (
            "MODE: CLINICAL — Conduct a structured wellness assessment. Be professional, "
            "warm, and thorough. Ask targeted questions. Summarize observations."
        ),
    }

    # Camera/biometric context
    camera_context = build_mental_state_block(camera_data, None)

    # Time context
    time_context = {
        "morning": "It is morning. The user may be starting their day — match fresh energy.",
        "afternoon": "It is afternoon. Energy may be dipping — be supportive and steady.",
        "evening": "It is evening. The user may be winding down — be gentle and reflective.",
        "night": "It is nighttime. Be especially soft and present.",
    }

    return f"""You are MindTrack AI, a real-time mental health companion. You can see the user's face through live biometric analysis. You are warm, deeply empathetic, genuinely helpful, and completely honest. You can discuss any topic — not only mental health.

LANGUAGE: Detect the language of every message. Respond in that exact language always. If the user switches language, switch immediately. If they mix languages, match the mix naturally. Support all languages automatically.

{camera_context}

{name_line}
{complexity_lines.get(complexity, "")}
{mode_lines.get(mode, mode_lines["companion"])}

{time_context.get(time_of_day, "")}

RESPONSE RULES:
- NEVER use "Certainly" "Absolutely" "Of course" "Great question" "I understand" or any hollow filler phrase
- ALWAYS validate feelings before offering perspective
- NEVER exceed 5-6 sentences unless asked something complex
- ALWAYS end with something that invites continuation
- NEVER repeat the same opening two messages in a row
- Sound like a real caring human not a script
- NEVER give generic advice — respond to THIS specific message
- Use contractions naturally (I'm, you're, it's)
- Match the user's energy and tone
- Short messages get shorter responses

CRISIS PROTOCOL:
If overall_risk exceeds 85 AND anxiety exceeds 80 simultaneously OR if the user expresses suicidal ideation, self-harm intent, or wanting to die — IMMEDIATELY output these resources BEFORE anything else:
📞 Call or text 988 — Suicide and Crisis Lifeline
💬 Text HOME to 741741 — Crisis Text Line
🌐 findahelpline.com for worldwide resources
Then ask if they are safe. Then continue with warm empathetic response.

NEVER:
- Claim to be human when directly asked
- Make medical diagnoses or prescribe medication
- Be preachy or lecture the user
- Repeat the same phrase twice in a row""".strip()


# ---------------------------------------------------------------------------
# Fallback Responses
# ---------------------------------------------------------------------------

FALLBACKS = {
    "connection": {
        "en": "I'm having a little trouble connecting right now. Give me a moment and try again 💙",
        "hi": "मुझे अभी थोड़ी कनेक्टिविटी समस्या है। एक पल रुकें और फिर कोशिश करें 💙",
        "es": "Tengo un pequeño problema de conexión ahora mismo. Dame un momento 💙",
        "fr": "J'ai un petit problème de connexion. Donne-moi un moment 💙",
    },
    "busy": {
        "en": "I'm a little busy right now — try again in just a moment 💙",
        "hi": "मैं अभी थोड़ा व्यस्त हूँ — एक पल में फिर कोशिश करें 💙",
        "es": "Estoy un poco ocupado ahora — intenta de nuevo en un momento 💙",
        "fr": "Je suis un peu occupé — réessaye dans un instant 💙",
    },
    "error": {
        "en": "Something went wrong on my end. I'm still here — please try again 💙",
        "hi": "मेरी तरफ से कुछ गलत हो गया। मैं अभी भी यहाँ हूँ — कृपया फिर से प्रयास करें 💙",
        "es": "Algo salió mal de mi parte. Todavía estoy aquí — inténtalo de nuevo 💙",
        "fr": "Quelque chose s'est mal passé de mon côté. Je suis toujours là — réessaye 💙",
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
            # Retry once after 1 second
            import asyncio
            await asyncio.sleep(1)
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
            except Exception:
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
            logger.warning("Groq rate limited, retrying once: %s", e)
            import asyncio
            await asyncio.sleep(1)
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
            except Exception:
                yield get_fallback_response(lang, "busy")
        elif "connection" in err or "unavailable" in err:
            yield get_fallback_response(lang, "connection")
        else:
            logger.error("Groq streaming error: %s", e)
            yield get_fallback_response(lang, "error")
