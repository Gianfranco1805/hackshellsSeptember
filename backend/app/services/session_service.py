"""Shared read/recompute logic for walk sessions.

Used by both the authenticated /walks router (her own status view) and the
public /public router (the zero-setup contact link) so escalation is
evaluated identically no matter who's polling.
"""

from datetime import datetime

from fastapi import HTTPException
from supabase import Client

from .escalation import evaluate_escalation, utcnow
from .geocoding_service import reverse_geocode
from .gemini_service import generate_escalation_summary
from .textbelt_service import send_escalation_sms

RECENT_PINGS_LIMIT = 10
CONTACT_FIELD_BY_LEVEL = {2: "primary_contact_id", 3: "emergency_contact_id"}


def get_owned_session(db: Client, walk_id: str, user_id: str) -> dict:
    try:
        res = (
            db.table("walk_sessions")
            .select("*")
            .eq("id", walk_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:  # postgrest raises when .single() finds no row
        raise HTTPException(status_code=404, detail="Walk session not found") from exc
    if not res.data:
        raise HTTPException(status_code=404, detail="Walk session not found")
    return res.data


def get_session_by_share_token(db: Client, share_token: str) -> dict:
    try:
        res = (
            db.table("walk_sessions")
            .select("*")
            .eq("share_token", share_token)
            .single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Walk not found") from exc
    if not res.data:
        raise HTTPException(status_code=404, detail="Walk not found")
    return res.data


def _notify_contact(db: Client, session: dict, level: int, alert_summary: str) -> bool | None:
    """Texts the contact for this level (2 -> primary, 3 -> emergency).

    Returns True/False for a send attempt, or None if there was no contact
    on file / no phone number to send to.

    No link in the body: TextBelt rejects texts containing a URL from an
    unverified API key (anti-spam policy) -- see backend/README.md. The
    share link itself is still available via the public status endpoint;
    it just isn't delivered inside this text until the key is verified.
    """
    contact_id = session.get(CONTACT_FIELD_BY_LEVEL.get(level, ""))
    if not contact_id:
        return None

    contact_res = db.table("contacts").select("name,phone").eq("id", contact_id).single().execute()
    contact = contact_res.data
    if not contact or not contact.get("phone"):
        return None

    body = f"Safety alert (Level {level}): {alert_summary}"
    return send_escalation_sms(contact["phone"], body)


def recent_pings(db: Client, session_id: str) -> list[dict]:
    res = (
        db.table("location_pings")
        .select("lat,lng,recorded_at")
        .eq("session_id", session_id)
        .order("recorded_at", desc=True)
        .limit(RECENT_PINGS_LIMIT)
        .execute()
    )
    return list(reversed(res.data or []))


async def reevaluate_session(db: Client, session: dict) -> tuple[dict, str | None]:
    """Recomputes escalation state for a session, persists any change, and
    returns (fresh_session, alert_summary_if_a_new_alert_just_fired)."""
    if session["status"] != "active":
        return session, None

    pings = recent_pings(db, session["id"])
    now = utcnow()
    result = evaluate_escalation(session, pings, now)

    updates: dict = {"is_stationary": result.is_stationary}
    alert_summary = None

    if result.transitioned:
        updates["current_level"] = result.new_level
        if result.new_level >= 4:
            updates["status"] = "escalated"

        started_at = session["started_at"]
        if isinstance(started_at, str):
            started_at = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        last_response = session.get("last_response_time") or session["last_ping_time"]
        if isinstance(last_response, str):
            last_response = datetime.fromisoformat(last_response.replace("Z", "+00:00"))

        context = {
            "level": result.new_level,
            "minutes_since_response": round((now - last_response).total_seconds() / 60, 1),
            "is_stationary": result.is_stationary,
            "lat": session.get("last_known_lat"),
            "lng": session.get("last_known_lng"),
            "minutes_into_walk": round((now - started_at).total_seconds() / 60, 1),
        }
        last_loc_ts = session.get("last_location_timestamp")
        if result.is_stationary and last_loc_ts:
            if isinstance(last_loc_ts, str):
                last_loc_ts = datetime.fromisoformat(last_loc_ts.replace("Z", "+00:00"))
            context["minutes_since_movement"] = round((now - last_loc_ts).total_seconds() / 60, 1)

        sms_sent = None
        if result.new_level in (2, 3):
            if context["lat"] is not None and context["lng"] is not None:
                location_label = await reverse_geocode(context["lat"], context["lng"])
                if location_label:
                    context["location_label"] = location_label
            alert_summary = await generate_escalation_summary(context)
            sms_sent = _notify_contact(db, session, result.new_level, alert_summary)
        elif result.new_level == 4:
            alert_summary = (
                "SIMULATED: this walk would now escalate to emergency services. "
                "No real call or message has been sent."
            )
        updates["last_alert_summary"] = alert_summary

    db.table("walk_sessions").update(updates).eq("id", session["id"]).execute()
    db.table("check_in_logs").insert(
        {
            "session_id": session["id"],
            "event_type": "level_change" if result.transitioned else "status_check",
            "level": result.new_level,
            "summary": alert_summary,
        }
    ).execute()

    if result.transitioned and result.new_level in (2, 3):
        db.table("check_in_logs").insert(
            {
                "session_id": session["id"],
                "event_type": "sms_sent" if sms_sent else "sms_not_sent",
                "level": result.new_level,
                "summary": None if sms_sent is None else ("delivered to TextBelt" if sms_sent else "send failed or unconfigured"),
            }
        ).execute()

    return {**session, **updates}, alert_summary
