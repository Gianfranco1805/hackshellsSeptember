"""Shared read/recompute logic for walk sessions.

Used by both the authenticated /walks router (her own status view) and the
public /public router (the zero-setup contact link) so escalation is
evaluated identically no matter who's polling.
"""

from datetime import datetime

from fastapi import HTTPException
from supabase import Client

from .escalation import evaluate_escalation, utcnow
from .gemini_service import generate_escalation_summary

RECENT_PINGS_LIMIT = 10


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

        if result.new_level in (2, 3):
            alert_summary = await generate_escalation_summary(context)
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

    return {**session, **updates}, alert_summary
