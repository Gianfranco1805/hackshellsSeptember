# Backend — Safety Walking Companion

FastAPI service owning: Supabase schema, auth verification, the check-in/escalation
state machine, GPS stillness detection, polling endpoints, alert generation
(Gemini), and the zero-setup public contact link. See `/PROJECT_HANDOFF.md`
at the repo root for the full product spec.

## Setup

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env     # fill in Supabase + Gemini values
```

Run the schema against your Supabase project: paste `supabase/schema.sql` into
the Supabase SQL editor (Dashboard -> SQL Editor -> New query -> Run).

Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health`

## Auth model

The frontend authenticates directly against Supabase Auth (sign up / log in)
and gets back a JWT. It sends that JWT as `Authorization: Bearer <token>` on
every request to this API. The backend verifies it against Supabase's public
JWKS endpoint (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, cached client in
`app/dependencies.py`) — no shared secret required, and it works whether the
project signs tokens with the legacy HS256 shared secret or the newer
asymmetric ES256/RS256 signing keys. All DB access from the backend uses the
service-role key, so the backend is the single source of truth for
authorization (see comments in `app/db.py` and `supabase/schema.sql`).

## How escalation actually runs

There's no background worker or cron ticking the clock — that would fight the
"polling only, no realtime" scope decision. Instead, escalation is
**recomputed lazily on every poll**: `GET /walks/{id}/status` (her own view)
and `GET /public/walks/{share_token}/status` (the contact link) both call the
same `reevaluate_session()` (`app/services/session_service.py`), which:

1. Pulls recent location pings and runs the stillness check
   (`app/services/escalation.py::determine_stationary`).
2. Compares elapsed silence against the check-in interval to decide whether
   to advance a level (`evaluate_escalation`).
3. If a new level just fired (2, 3, or 4), calls Gemini for a plain-language
   summary (Level 2/3) or attaches the simulated message (Level 4), persists
   the new state, and logs it to `check_in_logs`.

This means: as long as *something* polls a session regularly (the walker's
own app, or someone opening the contact link), escalation keeps moving even
though nothing is running in the background. If nobody polls for a while and
then does, it catches up correctly in one shot since it's driven by elapsed
wall-clock time, not by a tick count.

## Endpoints

Authenticated (require `Authorization: Bearer <supabase-jwt>`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/contacts` | List the user's saved contacts |
| POST | `/contacts` | Add a contact (`name`, `phone`, `type`: primary/emergency) |
| PUT | `/contacts/{id}` | Edit a contact |
| DELETE | `/contacts/{id}` | Remove a contact |
| POST | `/walks/start` | Start a walk (`primary_contact_id`, `emergency_contact_id`, `check_in_interval_seconds`) |
| POST | `/walks/{id}/checkin` | "I'm okay" — resets to Level 1 |
| POST | `/walks/{id}/location` | Report a GPS point (`lat`, `lng`); also re-evaluates escalation |
| GET | `/walks/{id}/status` | Poll current status; re-evaluates escalation |
| POST | `/walks/{id}/resolve` | End the walk |

Public (no auth — this is the "just a link" contact experience):

| Method | Path | Purpose |
|---|---|---|
| GET | `/public/walks/{share_token}/status` | Sanitized status for a contact: level, location, Gemini summary, elapsed time. No phone numbers or other PII. |

`share_token` comes back as part of `share_url` in every `WalkStatusOut`
response (`{PUBLIC_BASE_URL}/status/{share_token}`) — that's the link to text/share.

## Gemini fallback

If `GEMINI_API_KEY` is unset, the call errors, or it takes longer than 6s,
`app/services/gemini_service.py` returns a templated summary built from the
same structured context instead of raising — an alert always has *some*
readable text, per the handoff doc's explicit fallback requirement.

## Location label (reverse geocoding)

Before generating a Level 2/3 summary, `session_service.reevaluate_session()`
calls `app/services/geocoding_service.py::reverse_geocode()` to turn the
last-known lat/lng into a short address (e.g. "NW 7th St, Miami") via
[OpenStreetMap's Nominatim](https://nominatim.openstreetmap.org) — free, no
API key or signup, unlike Google Maps Geocoding (needs a billed key) or
OpenTripMap (needs a key request and is POI-oriented, not built for address
lookup). The result populates `location_label` in the context passed to
Gemini, which already preferred that field over raw coordinates
(`gemini_service.py::_location_label`) but never had it populated before now.

Same fallback philosophy as everywhere else: a failed or slow (>4s) lookup
returns `None` and the summary just falls back to raw coordinates instead of
blocking escalation. No Maps link is added anywhere in the SMS — see the
TextBelt section above for why.

## Alert delivery (SMS via TextBelt)

When a session escalates to Level 2 or 3, `session_service._notify_contact()`
texts the relevant contact (primary at 2, emergency at 3) via
[TextBelt](https://textbelt.com) (`app/services/textbelt_service.py`) with the
Gemini summary. Same fallback philosophy as Gemini: if TextBelt isn't configured or the send fails, the escalation still
proceeds and the alert is still visible via the public link — a broken
delivery integration never blocks the state machine. Each attempt is logged
to `check_in_logs` as `sms_sent` / `sms_not_sent`.

**Why TextBelt**: real SMS from a Twilio number to US numbers requires A2P
10DLC carrier registration, which takes days to approve — doesn't fit a
hackathon timeline. TextBelt is a single HTTP POST with no carrier
registration and no recipient opt-in step, so it's what's actually wired up.

Requires `TEXTBELT_API_KEY` (see `.env.example`). Leave it unset to run with
sending disabled — alerts still generate and are visible via the public link
either way (logged as `sms_not_sent`, escalation still proceeds).

**The text body does not include the `share_url`.** TextBelt rejects any
message containing a URL from an unverified key ("ability to send URLs via
text is limited to verified accounts") — confirmed against the real API.
Verification is a manual review (email support@textbelt.com or use the link
`https://textbelt.com/whitelist?key=...` returns). Until the key is verified,
the SMS is level + plain-language summary only; the link itself still works
and is still returned by both status endpoints, it just isn't texted
automatically. Once verified, add the link back into the body built in
`session_service._notify_contact()`.
