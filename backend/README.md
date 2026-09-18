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

## Open items for whoever wires up SMS

Alert sending is currently "generate the summary and persist it" — actual SMS
delivery to contacts isn't implemented (handoff doc leaves this as
simulated-or-real, team's call). `last_alert_summary` on `walk_sessions` plus
the `share_url` is everything needed to plug in a provider (e.g. Twilio) at
the point in `session_service.reevaluate_session()` where the summary is
generated.
