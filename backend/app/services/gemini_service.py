"""Gemini integration described in PROJECT_HANDOFF.md section 5.

Called once, at the moment a walk session escalates to Level 2 or 3, to turn
structured session data into 1-2 plain-language sentences for the contact.
This must never be a single point of failure: if the API key is missing, the
call errors, or it's slow, we fall back to a templated summary built from the
same context so the alert still sends with useful information.
"""

import asyncio
import logging

import google.generativeai as genai

from ..config import settings

logger = logging.getLogger(__name__)

GEMINI_TIMEOUT_SECONDS = 6

_configured = False


def _ensure_configured() -> None:
    global _configured
    if not _configured and settings.gemini_api_key:
        genai.configure(api_key=settings.gemini_api_key)
        _configured = True


def _location_label(context: dict) -> str:
    if context.get("location_label"):
        return context["location_label"]
    lat, lng = context.get("lat"), context.get("lng")
    if lat is None or lng is None:
        return "location unavailable"
    return f"{lat:.5f}, {lng:.5f}"


def _fallback_summary(context: dict) -> str:
    parts = [
        f"Level {context['level']} alert: no check-in response for "
        f"{context['minutes_since_response']} min.",
        f"Last known location: {_location_label(context)}.",
    ]
    if context.get("is_stationary"):
        parts.append("She has not moved from this spot.")
    return " ".join(parts)


def _build_prompt(context: dict) -> str:
    return f"""You are generating a short safety alert for a trusted contact. Someone using a
safety walking app has missed check-ins. Write 1-2 plain, calm, factual sentences
summarizing the situation for the contact. No preamble, no bullet points, no markdown
-- just the sentences, ready to read as-is.

Facts:
- Escalation level just triggered: {context['level']} (2 = primary contact, 3 = emergency contact)
- Minutes since her last check-in response: {context['minutes_since_response']}
- Is she currently stationary (hasn't moved): {context['is_stationary']}
- Minutes since she last moved (only meaningful if stationary): {context.get('minutes_since_movement', 'n/a')}
- Last known location: {_location_label(context)}
- Minutes elapsed since she started this walk: {context['minutes_into_walk']}
"""


async def generate_escalation_summary(context: dict) -> str:
    """Returns a short plain-language summary for a contact alert.

    `context` keys: level, minutes_since_response, is_stationary,
    minutes_since_movement (optional), lat, lng, location_label (optional),
    minutes_into_walk.
    """
    _ensure_configured()
    if not settings.gemini_api_key:
        return _fallback_summary(context)

    try:
        model = genai.GenerativeModel(settings.gemini_model)
        prompt = _build_prompt(context)
        response = await asyncio.wait_for(
            asyncio.to_thread(model.generate_content, prompt),
            timeout=GEMINI_TIMEOUT_SECONDS,
        )
        text = (getattr(response, "text", None) or "").strip()
        return text or _fallback_summary(context)
    except Exception:
        logger.exception("Gemini summary generation failed; using fallback text")
        return _fallback_summary(context)
