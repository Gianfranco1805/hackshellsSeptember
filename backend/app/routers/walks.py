from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from ..config import settings
from ..db import get_supabase
from ..dependencies import get_current_user_id
from ..schemas import LocationUpdate, WalkStartRequest, WalkStatusOut
from ..services.escalation import utcnow
from ..services.session_service import get_owned_session, reevaluate_session

router = APIRouter(prefix="/walks", tags=["walks"])

STATUS_FIELDS = (
    "id",
    "status",
    "current_level",
    "is_stationary",
    "check_in_interval_seconds",
    "started_at",
    "last_ping_time",
    "last_response_time",
    "last_known_lat",
    "last_known_lng",
    "last_location_timestamp",
)


def _to_status_out(session: dict) -> WalkStatusOut:
    seconds_left = None
    if session["status"] == "active" and session["current_level"] < 4:
        interval = session["check_in_interval_seconds"]
        last_response = session.get("last_response_time") or session["last_ping_time"]
        if isinstance(last_response, str):
            last_response = datetime.fromisoformat(last_response.replace("Z", "+00:00"))
        elapsed = (utcnow() - last_response).total_seconds()
        seconds_left = max(0, int(interval - elapsed))

    share_token = session.get("share_token")
    return WalkStatusOut(
        **{field: session[field] for field in STATUS_FIELDS},
        seconds_until_next_escalation=seconds_left,
        alert_summary=session.get("last_alert_summary"),
        share_url=f"{settings.public_base_url}/status/{share_token}" if share_token else None,
    )


@router.post("/start", response_model=WalkStatusOut, status_code=201)
async def start_walk(payload: WalkStartRequest, user_id: str = Depends(get_current_user_id)):
    db = get_supabase()

    owned = (
        db.table("contacts")
        .select("id")
        .eq("user_id", user_id)
        .in_("id", [payload.primary_contact_id, payload.emergency_contact_id])
        .execute()
    )
    if len({row["id"] for row in owned.data or []}) != 2:
        raise HTTPException(
            status_code=400, detail="Both contacts must belong to you and exist"
        )

    now = utcnow()
    row = {
        "user_id": user_id,
        "primary_contact_id": payload.primary_contact_id,
        "emergency_contact_id": payload.emergency_contact_id,
        "check_in_interval_seconds": payload.check_in_interval_seconds,
        "current_level": 1,
        "status": "active",
        "started_at": now.isoformat(),
        "last_ping_time": now.isoformat(),
    }
    res = db.table("walk_sessions").insert(row).execute()
    return _to_status_out(res.data[0])


@router.post("/{walk_id}/checkin", response_model=WalkStatusOut)
async def checkin(walk_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_supabase()
    session = get_owned_session(db, walk_id, user_id)
    if session["status"] != "active":
        raise HTTPException(status_code=400, detail="Walk is not active")

    now = utcnow()
    updates = {
        "current_level": 1,
        "last_ping_time": now.isoformat(),
        "last_response_time": now.isoformat(),
        "last_alert_summary": None,
    }
    db.table("walk_sessions").update(updates).eq("id", walk_id).execute()
    db.table("check_in_logs").insert(
        {"session_id": walk_id, "event_type": "checkin_ok", "level": 1}
    ).execute()

    return _to_status_out({**session, **updates})


@router.post("/{walk_id}/location", response_model=WalkStatusOut)
async def update_location(
    walk_id: str, payload: LocationUpdate, user_id: str = Depends(get_current_user_id)
):
    db = get_supabase()
    session = get_owned_session(db, walk_id, user_id)
    if session["status"] != "active":
        raise HTTPException(status_code=400, detail="Walk is not active")

    now = utcnow()
    db.table("location_pings").insert(
        {
            "session_id": walk_id,
            "lat": payload.lat,
            "lng": payload.lng,
            "recorded_at": now.isoformat(),
        }
    ).execute()

    location_updates = {
        "last_known_lat": payload.lat,
        "last_known_lng": payload.lng,
        "last_location_timestamp": now.isoformat(),
    }
    db.table("walk_sessions").update(location_updates).eq("id", walk_id).execute()

    fresh, _ = await reevaluate_session(db, {**session, **location_updates})
    return _to_status_out(fresh)


@router.get("/{walk_id}/status", response_model=WalkStatusOut)
async def get_status(walk_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_supabase()
    session = get_owned_session(db, walk_id, user_id)
    fresh, _ = await reevaluate_session(db, session)
    return _to_status_out(fresh)


@router.post("/{walk_id}/resolve", response_model=WalkStatusOut)
async def resolve_walk(walk_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_supabase()
    session = get_owned_session(db, walk_id, user_id)

    now = utcnow()
    updates = {"status": "resolved", "resolved_at": now.isoformat()}
    db.table("walk_sessions").update(updates).eq("id", walk_id).execute()
    db.table("check_in_logs").insert(
        {"session_id": walk_id, "event_type": "resolved", "level": session["current_level"]}
    ).execute()

    return _to_status_out({**session, **updates})
