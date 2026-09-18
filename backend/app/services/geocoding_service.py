"""Reverse geocoding for escalation alerts.

Turns a last-known lat/lng into a short human-readable label (e.g. "NW 7th
St, Miami") for use in Gemini's alert summary. gemini_service.py already
prefers a `location_label` context key over raw coordinates
(`_location_label()`), but nothing ever populated it -- this is that piece.

Uses OpenStreetMap's Nominatim (https://nominatim.openstreetmap.org) --
free, no API key or signup, which fits a hackathon timeline (no Google Maps
billing setup, no OpenTripMap key request). Nominatim's usage policy
requires an identifying User-Agent and caps usage at ~1 request/second;
both are satisfied here since this fires at most once per escalation event,
never in a loop.

Same fallback philosophy as Gemini/TextBelt: a failed or slow lookup must
never block escalation. Any error just means the summary falls back to raw
coordinates instead of an address (see gemini_service.py::_location_label).
"""

import logging

import httpx

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
GEOCODE_TIMEOUT_SECONDS = 4
USER_AGENT = "SafetyWalkingCompanion-Hackathon (https://github.com/Gianfranco1805/hackshellsSeptember)"


async def reverse_geocode(lat: float, lng: float) -> str | None:
    """Returns a short address label for (lat, lng), or None on any failure."""
    try:
        async with httpx.AsyncClient(timeout=GEOCODE_TIMEOUT_SECONDS) as client:
            response = await client.get(
                NOMINATIM_URL,
                params={
                    "format": "jsonv2",
                    "lat": lat,
                    "lon": lng,
                    "zoom": 16,
                    "addressdetails": 1,
                },
                headers={"User-Agent": USER_AGENT},
            )
            response.raise_for_status()
            data = response.json()
    except (httpx.HTTPError, ValueError):
        logger.exception("Reverse geocoding failed for (%s, %s)", lat, lng)
        return None

    address = data.get("address") or {}
    street = address.get("road") or address.get("suburb") or address.get("neighbourhood")
    city = address.get("city") or address.get("town") or address.get("village")

    parts = [p for p in (street, city) if p]
    if parts:
        return ", ".join(parts)
    return data.get("display_name")
