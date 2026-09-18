"""Reverse geocoding for escalation alerts.

Turns a last-known lat/lng into a full mailing-style address (e.g. "11200
Southwest 8th Street, Miami, Florida 33199") for use in Gemini's alert
summary and the SMS body. gemini_service.py already prefers a
`location_label` context key over raw coordinates (`_location_label()`),
but nothing ever populated it -- this is that piece.

The address is deliberately formatted like a standard postal address rather
than a short "street, city" label: iOS Messages and Android Messages both
auto-detect a well-formed postal address in plain text and make it tappable
to open in the phone's default Maps app -- no actual http(s) link needed.
That matters here because TextBelt rejects any text containing a real URL
from an unverified key (see textbelt_service.py) -- a plain address string
isn't a URL, so it sidesteps that restriction while still being "openable."

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

# Building-level zoom -- gets us a house_number when one exists nearby,
# which is what makes the address specific enough for a phone to recognize
# and tap-to-open. Lower zoom (e.g. 16) tends to only resolve to a bare
# street name with no house number or city.
REVERSE_GEOCODE_ZOOM = 18


async def reverse_geocode(lat: float, lng: float) -> str | None:
    """Returns a full postal-style address for (lat, lng), or None on failure.

    Format: "<house_number> <road>, <city>, <state> <postcode>", degrading
    gracefully (dropping whichever pieces Nominatim didn't return) down to
    the raw `display_name` if none of the structured fields are present.
    """
    try:
        async with httpx.AsyncClient(timeout=GEOCODE_TIMEOUT_SECONDS) as client:
            response = await client.get(
                NOMINATIM_URL,
                params={
                    "format": "jsonv2",
                    "lat": lat,
                    "lon": lng,
                    "zoom": REVERSE_GEOCODE_ZOOM,
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
    road = address.get("road") or address.get("suburb") or address.get("neighbourhood")
    street = " ".join(p for p in (address.get("house_number"), road) if p) or road
    city = address.get("city") or address.get("town") or address.get("village")
    state = address.get("state")
    postcode = address.get("postcode")

    locality = ", ".join(p for p in (city, state) if p)
    label = ", ".join(p for p in (street, locality) if p)
    if postcode and label:
        label = f"{label} {postcode}"

    return label or data.get("display_name")
