"""TextBelt SMS delivery for escalation alerts.

Fires when a walk session escalates to Level 2 (primary contact) or Level 3
(emergency contact) -- see session_service.reevaluate_session. Same
never-a-single-point-of-failure pattern as Gemini: a failed or misconfigured
send must never block the escalation itself. The alert text and location are
already persisted on the session and visible via the public share link
regardless of whether the SMS actually goes out.

Uses TextBelt (https://textbelt.com) instead of sending SMS directly through
Twilio because real US SMS from a Twilio number requires A2P 10DLC carrier
registration, a multi-day approval process that doesn't fit a hackathon
timeline. TextBelt is a single HTTP POST with no registration step and no
recipient opt-in required.
"""

import logging

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

TEXTBELT_URL = "https://textbelt.com/text"
TEXTBELT_TIMEOUT_SECONDS = 6


def send_escalation_sms(to_phone: str, body: str) -> bool:
    """Returns True if TextBelt accepted the message for delivery."""
    if not settings.textbelt_api_key:
        logger.warning("TextBelt not configured -- skipping alert send to %s", to_phone)
        return False
    try:
        response = httpx.post(
            TEXTBELT_URL,
            data={
                "phone": to_phone,
                "message": body,
                "key": settings.textbelt_api_key,
            },
            timeout=TEXTBELT_TIMEOUT_SECONDS,
        )
        result = response.json()
        if not result.get("success"):
            logger.warning("TextBelt send failed for %s: %s", to_phone, result.get("error"))
        return bool(result.get("success"))
    except (httpx.HTTPError, ValueError):
        logger.exception("TextBelt send failed for %s", to_phone)
        return False
