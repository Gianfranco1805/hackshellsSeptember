from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

ContactType = Literal["primary", "emergency"]
WalkStatus = Literal["active", "resolved", "escalated"]


class ContactCreate(BaseModel):
    name: str
    phone: str
    type: ContactType


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    type: Optional[ContactType] = None


class ContactOut(BaseModel):
    id: str
    user_id: str
    name: str
    phone: str
    type: ContactType
    created_at: datetime


class WalkStartRequest(BaseModel):
    primary_contact_id: str
    emergency_contact_id: str
    check_in_interval_seconds: int = Field(ge=10, le=3600)


class LocationUpdate(BaseModel):
    lat: float
    lng: float


class DebugStationaryRequest(BaseModel):
    stationary: bool


class WalkStatusOut(BaseModel):
    id: str
    status: WalkStatus
    current_level: int
    is_stationary: bool
    check_in_interval_seconds: int
    started_at: datetime
    last_ping_time: datetime
    last_response_time: Optional[datetime] = None
    last_known_lat: Optional[float] = None
    last_known_lng: Optional[float] = None
    last_location_timestamp: Optional[datetime] = None
    seconds_until_next_escalation: Optional[int] = None
    alert_summary: Optional[str] = None
    share_url: Optional[str] = None


class PublicWalkStatusOut(BaseModel):
    """Sanitized status shown to a contact who opens the alert link.

    Deliberately excludes contact PII (phone numbers, the other contact's
    identity) -- only what's needed to understand and act on the alert.
    """

    status: WalkStatus
    current_level: int
    is_stationary: bool
    last_known_lat: Optional[float] = None
    last_known_lng: Optional[float] = None
    last_location_timestamp: Optional[datetime] = None
    minutes_into_walk: float
    alert_summary: Optional[str] = None
