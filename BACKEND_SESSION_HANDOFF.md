# Backend Session Handoff

Session summary for developer B (backend). Written because this Claude Code
session is being handed off to a new one — read this first before touching
`backend/`.

---

## 1. What's fully done and merged to `main`

- **FastAPI scaffold** (PR #2): Supabase schema (`contacts`, `walk_sessions`,
  `location_pings`, `check_in_logs`, RLS policies), full endpoint set
  (`/contacts`, `/walks/start|checkin|location|status|resolve`,
  `/public/walks/{share_token}/status`), the lazily-recomputed escalation
  state machine (levels 1-4, grace period vs. stationary-skip logic — see
  `backend/app/services/escalation.py`), GPS stillness detection, and Gemini
  integration with a templated fallback.
- **JWKS auth fix** (PR #6): the live Supabase project signs tokens with
  ES256 (asymmetric signing keys), not the legacy HS256 shared secret. Auth
  verification in `backend/app/dependencies.py` uses `PyJWKClient` against
  Supabase's public JWKS endpoint instead — no shared secret needed at all.
  Verified end-to-end against real Supabase-issued tokens.
- **Live Supabase project is provisioned and wired up**: schema applied,
  `.env` has real `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`. Verified full CRUD
  round trip (contacts) and a full escalation cycle (start walk → miss
  check-in → auto-escalate to Level 2 with a real Gemini-fallback summary)
  against the real database.
- Backend has been running locally throughout this session at
  `http://localhost:8000` (uvicorn, no `--reload`) — **check whether it's
  still running** when you pick this back up; restart with:
  ```
  cd backend && source .venv/Scripts/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```

## 2. What's uncommitted right now — read before doing anything else

Working tree on `main` has uncommitted local changes implementing a
**WhatsApp Sandbox** alert-delivery integration that **we are abandoning in
favor of TextBelt** (see section 3). Modified/new files:

```
 M backend/.env.example
 M backend/README.md
 M backend/app/config.py
 M backend/app/services/session_service.py
 M backend/requirements.txt
?? backend/app/services/whatsapp_service.py
```

**Decide before continuing**: either `git checkout` these files back to the
last commit and start the TextBelt integration clean, or keep the
`session_service.py` wiring pattern (the `_notify_contact()` hook that fires
on Level 2/3 transitions) and just swap `whatsapp_service.py` for a new
`textbelt_service.py` with a matching `send_escalation_sms(to_phone, body) ->
bool` signature. The second option is less rework — the hook, logging
(`check_in_logs` event types `whatsapp_sent`/`whatsapp_not_sent`, should
become `sms_sent`/`sms_not_sent` or similar), and fallback philosophy (never
block escalation on a failed send) all carry over directly.

## 3. Why we're switching to TextBelt

Original plan was real SMS via Twilio. That's a dead end for this timeline:
**Twilio blocks SMS to US numbers from unregistered A2P 10DLC numbers**
(error 30034), confirmed via Twilio's own docs — registration takes days.
Toll-free numbers also need review (not instant). Twilio Verify only sends
OTP codes, not free-form text, so it doesn't fit.

Pivoted to **Twilio's WhatsApp Sandbox** as a same-day alternative (no A2P
10DLC requirement) — got as far as: real Twilio credentials wired in,
verified account, provisioned trial number `+17817347031`, verified test
recipient `+13057136631` as an Outgoing Caller ID. Blocked at the last step:
sending failed with "Twilio could not find a Channel with the specified From
address" — the account's WhatsApp Sandbox itself hasn't been activated yet
(needs a one-time visit to Console → Messaging → Try it out → Send a
WhatsApp message, then the recipient must text a join code to
`+14155238886` before they can receive anything).

**Decision**: switch to **TextBelt** instead
(https://textbelt.com — simple HTTP API, `textbelt` npm/pip-free, just a POST
request with a phone number, message, and API key) for real SMS delivery.
Not yet implemented — this is the next task.

## 4. Credentials currently in `backend/.env` (gitignored, not committed)

- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — real, live, working.
- `GEMINI_API_KEY` — still placeholder (`your-gemini-api-key`). Gemini
  integration has only been exercised via its fallback path, never a real
  call. Worth testing with a real key before the demo, per
  `PROJECT_HANDOFF.md`'s emphasis on Gemini-generated summaries as a
  differentiator.
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — real trial credentials (from
  the abandoned Twilio path). Harmless to leave in `.env`, not used once
  TextBelt replaces them — remove when cleaning up.
- Test Supabase Auth user: `backend-jwt-check@example.com` /
  `Temp-Password-123!` — already satisfies the "1-2 test Auth users" ask from
  `BACKEND_INTEGRATION_HANDOFF.md` item 4.

## 5. Outstanding items (from `BACKEND_INTEGRATION_HANDOFF.md` and
   `PROJECT_HANDOFF.md` section 6 — backend's role)

1. **TextBelt SMS integration** — in progress, see section 3. This is the
   active task.
2. **Real Gemini call untested** — needs a real `GEMINI_API_KEY`.
3. **Anon key relay** — needs to go from you to the frontend teammate
   directly (not something this backend session touches).
4. **Render deploy** — explicitly deferred until closer to demo day, not
   urgent.
5. **Minor, explicitly non-blocking** (frontend teammate flagged, said not to
   worry about yet): `DELETE /contacts/{id}` doesn't 404 on a nonexistent id;
   `POST /walks/{id}/resolve` doesn't guard against double-resolving.

## 6. Workflow notes for whoever picks this up

- Land backend changes via branch → PR → merge into `main` (not direct
  push) — that's the pattern used for PRs #2 and #6 this session, and it's
  what the user has asked for each time.
- Before pushing/opening a PR, always `git fetch origin` and check
  `git log main..origin/main --stat` for anything the frontend teammate
  merged in the meantime — has happened several times this session, always
  cleanly non-overlapping (`frontend/` vs `backend/` paths).
- `gh` CLI is installed at `C:\Program Files\GitHub CLI\gh.exe` (not on the
  Bash session's PATH — invoke with the full path, or `& "C:\Program Files\
  GitHub CLI\gh.exe"` in PowerShell) and already authenticated as
  `Gianfranco1805`.
