"""The zero-setup contact link (PROJECT_HANDOFF.md section 1 differentiator).

No auth required -- a contact just opens the link they were sent. Returns a
sanitized status payload (see schemas.PublicWalkStatusOut): no contact PII,
just what's needed to understand and act on the alert.
"""

from datetime import datetime

from fastapi import APIRouter

from ..db import get_supabase
from ..schemas import PublicWalkStatusOut
from ..services.escalation import utcnow
from ..services.session_service import get_session_by_share_token, reevaluate_session

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/walks/{share_token}/status", response_model=PublicWalkStatusOut)
async def public_status(share_token: str):
    db = get_supabase()
    session = get_session_by_share_token(db, share_token)
    session, _ = await reevaluate_session(db, session)

    started_at = session["started_at"]
    if isinstance(started_at, str):
        started_at = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    minutes_into_walk = round((utcnow() - started_at).total_seconds() / 60, 1)

    return PublicWalkStatusOut(
        status=session["status"],
        current_level=session["current_level"],
        is_stationary=session["is_stationary"],
        last_known_lat=session.get("last_known_lat"),
        last_known_lng=session.get("last_known_lng"),
        last_location_timestamp=session.get("last_location_timestamp"),
        minutes_into_walk=minutes_into_walk,
        alert_summary=session.get("last_alert_summary"),
    )
