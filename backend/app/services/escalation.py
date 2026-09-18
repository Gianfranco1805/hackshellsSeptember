"""The escalation state machine described in PROJECT_HANDOFF.md section 4.

This is evaluated lazily -- there is no background worker or cron job ticking
the clock. Every time a session is polled (by the app owner's own status
screen or the contact-facing public link), we recompute whether enough silent
time has passed to move to the next level. That fits the "polling only, no
realtime" architecture decision and keeps the whole thing stateless between
requests.

Levels:
    1 - Ping sent, awaiting her response within the check-in interval.
    2 - Missed check-in -> Primary Contact notified.
    3 - Continued silence -> Emergency Contact notified.
    4 - Continued silence -> simulated "would now escalate to emergency
        services" screen. Never triggers anything real (see scope decisions).
"""

from dataclasses import dataclass
from datetime import datetime, timezone

from .geo import haversine_distance_meters

# If she's moving normally, give her this many extra seconds beyond the
# check-in interval before treating a missed ping as an escalation trigger.
GRACE_PERIOD_SECONDS = 120

# A stationary read requires at least two location pings within this window
# that are all within STATIONARY_DISTANCE_METERS of each other.
STATIONARY_WINDOW_SECONDS = 180
STATIONARY_DISTANCE_METERS = 30

MAX_LEVEL = 4


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value):
    """Supabase returns timestamps as ISO strings; normalize to aware datetimes."""
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value


def determine_stationary(pings: list[dict], now: datetime) -> bool:
    """pings: list of {lat, lng, recorded_at}, any order, recorded_at as datetime or ISO str."""
    recent = [p for p in pings if (now - _as_utc(p["recorded_at"])).total_seconds() <= STATIONARY_WINDOW_SECONDS]
    if len(recent) < 2:
        return False
    base = recent[0]
    return all(
        haversine_distance_meters(base["lat"], base["lng"], p["lat"], p["lng"]) <= STATIONARY_DISTANCE_METERS
        for p in recent[1:]
    )


@dataclass
class EscalationResult:
    new_level: int
    transitioned: bool
    is_stationary: bool
    reason: str


def evaluate_escalation(session: dict, pings: list[dict], now: datetime | None = None) -> EscalationResult:
    now = now or utcnow()
    level = session["current_level"]

    if session["status"] != "active":
        return EscalationResult(level, False, session.get("is_stationary", False), "session not active")

    is_stationary = determine_stationary(pings, now)

    if level >= MAX_LEVEL:
        return EscalationResult(level, False, is_stationary, "already at max simulated level")

    last_response = session.get("last_response_time") or session["last_ping_time"]
    elapsed_seconds = (now - _as_utc(last_response)).total_seconds()
    interval = session["check_in_interval_seconds"]

    if level == 1:
        # Stationary is a stronger signal -- skip the grace period entirely.
        threshold = interval if is_stationary else interval + GRACE_PERIOD_SECONDS
        if elapsed_seconds > threshold:
            reason = "missed check-in" + (" while stationary" if is_stationary else "")
            return EscalationResult(2, True, is_stationary, reason)
        return EscalationResult(1, False, is_stationary, "within check-in window")

    # Levels 2 and 3: another full interval of continued silence advances the level.
    if elapsed_seconds > interval:
        return EscalationResult(level + 1, True, is_stationary, "continued silence")
    return EscalationResult(level, False, is_stationary, "awaiting response at current level")
