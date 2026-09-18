# [Project Name TBD] — Safety Walking Companion
### EmpowHER Hackathon — Miami / South Florida

---

## 1. The Pitch (in one paragraph)

A safety walking companion for women navigating Miami (with FIU as our anchor community), built around a tiered check-in escalation system. The user sets her own check-in interval when she starts a walk. If she misses a check-in, the app checks whether she's still moving — if she's stationary, that's treated as a stronger signal and escalation speeds up. Escalation runs through four levels: (1) self check-in ping, (2) primary contact notified, (3) emergency contact notified, (4) a simulated "would now escalate to emergency services" screen — included to complete the story without any risk of a real call during the demo. When it escalates, Gemini generates a plain-language summary of what's happening instead of raw coordinates, so a contact can process it instantly.

**Community & barrier:** women walking alone in Miami who want a safety net that doesn't require the people they trust to install anything.

**Differentiator to say out loud in the pitch:** the contact side needs zero setup — just a link. Most safety apps require both sides to install the app.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript |
| Frontend hosting | Vercel |
| Backend | Python, FastAPI |
| Backend hosting | Render |
| Database + Auth | Supabase (Postgres) |
| Location updates | Polling (no realtime/websockets — free, reliable, good enough for demo) |
| AI | Gemini API — generates escalation alert summaries |

**Repo structure:** monorepo

```
/repo-root
  /frontend      (React + TS app)
  /backend       (FastAPI app)
  /shared        (optional — shared types/constants if needed)
  README.md
  PROJECT_HANDOFF.md   (this file)
```

---

## 3. Core User Flow

1. **Sign up / log in** (Supabase Auth)
2. **Contacts tab** — add a Primary Contact and an Emergency Contact (name + phone number each), saved to her account ahead of time
3. **Start a walk** — select contacts from saved list, set a check-in interval (e.g., every 10 min)
4. **Check-in ping** — app prompts "Are you okay?" at the set interval; she taps to confirm
5. **Missed ping →** backend checks her GPS:
   - Still moving normally → escalate to **Level 2** (Primary Contact notified)
   - Stationary → treat as stronger signal, escalate faster (can skip straight to Level 2, or compress the timer — team to confirm exact logic, see Section 5)
6. **Continued silence → Level 3** (Emergency Contact notified, e.g., a parent)
7. **Continued silence → Level 4** — simulated, non-functional "would now contact emergency services" screen (never places a real call/text — for demo storytelling only)
8. **Contact link** — when Level 2 or 3 fires, the contact gets a link (SMS or simulated for demo) to a page showing her last known location, current status/level, and a **Gemini-generated plain-language summary** of the situation

---

## 4. Escalation Logic (Backend Owns This)

**State machine, roughly:**

```
Level 1: Ping sent → awaiting response
  ↓ (no response within interval)
Check GPS:
  - Moving normally → Level 2
  - Stationary       → Level 2 (faster/immediate — skip grace period)
  ↓ (no response after Level 2 alert + some window)
Level 3
  ↓ (no response after Level 3 alert + some window)
Level 4 (simulated only)
```

**Data you'll likely need to track per walk session:**
- `session_id`, `user_id`
- `check_in_interval`
- `current_level` (1–4)
- `last_ping_time`, `last_response_time`
- `last_known_lat`, `last_known_lng`, `last_location_timestamp`
- `is_stationary` (derived: compare last N location points)
- `primary_contact_id`, `emergency_contact_id`
- `status` (active / resolved / escalated)

**Suggested tables (Supabase/Postgres):**
- `users` (Supabase Auth handles most of this)
- `contacts` (`user_id`, `name`, `phone`, `type`: primary/emergency)
- `walk_sessions` (fields above)
- `check_in_logs` (optional — timestamped history of pings/responses, useful for the Gemini summary context)

---

## 5. Gemini Integration — Escalation Alert Summaries

**What it does:** when a walk session escalates to Level 2 or Level 3, send the raw session data to Gemini and get back a short, human-readable summary for the contact — instead of them just seeing coordinates and a timestamp.

**Example input context to send:**
- Time since last check-in response
- Time since last movement (if stationary)
- Last known location (address/cross-street if you reverse-geocode, or raw coords if time is short)
- Which escalation level just triggered
- How far into the walk she is (elapsed time since start)

**Example desired output:**
> "She hasn't responded to a check-in in 6 minutes and hasn't moved from her location near NW 7th St for the last 4 minutes — this is unusual based on her walk so far."

**Where it lives:** one backend function, called at the moment an escalation fires (Level 2 or Level 3 trigger). Single request/response — no need for conversation history or complex prompting. Keep the prompt tight: feed it structured data, ask for 1–2 plain sentences, nothing more.

**Fallback:** if the Gemini call fails or is slow, the alert should still send with the raw data (don't let this be a single point of failure for the demo).

---

## 6. Team Roles

### Frontend (You)
- Auth screens (Supabase Auth — sign up / log in)
- Contacts tab: add/edit Primary + Emergency contact
- Start-walk flow: select contacts, set check-in interval
- Check-in ping UI (the "are you okay?" prompt + confirm button)
- Her own escalation status view (what she sees as levels change)
- Mobile-responsive styling throughout (this is a phone-first app)

### Backend (Teammate)
- Supabase schema: users, contacts, walk_sessions, check_in_logs
- Auth wiring (Supabase Auth + FastAPI)
- Check-in timer logic + escalation state machine (Level 1 → 4)
- GPS stillness/movement check triggered on a missed ping
- Polling endpoint(s) for location + status
- Alert sending (SMS via a simple/free method, or simulated for demo — team to decide)
- **Gemini API integration** — call it at escalation time, pass structured context, return summary text to include in the alert

### Contact-Facing View + Support Role (Third teammate)
- The page a contact opens from the alert link: map showing her last known location, current escalation level, and the **Gemini-generated summary**
- Polls the same backend endpoint the frontend uses for status
- Owns the simulated Level 4 "would now escalate to emergency services" screen end-to-end (self-contained, lower complexity — no real functionality)
- Good candidate for an early pairing session (30–60 min) with the backend teammate to understand the polling endpoint and data shape before working independently

---

## 7. Explicit Scope Decisions (so nobody re-litigates these mid-build)

- ❌ No native contacts picker — contacts are entered manually in a Contacts tab, saved to the account
- ❌ No real emergency services integration — Level 4 is simulated/visual only, never fires a real call or text
- ❌ No realtime websockets — location updates via polling only
- ✅ Real auth via Supabase (not local storage) — contacts are protected behind login
- ✅ Stationary detection accelerates escalation speed (not just included in the alert text)
- ✅ Framing: Miami / South Florida, with FIU as the specific anchor story in the pitch

---

## 8. Next Steps After MVP (mention in pitch, don't build)

- Real emergency services integration with an authentication/verification step to prevent misuse
- Voice-based check-in confirmation (say "I'm okay" instead of tapping)
- Expansion beyond FIU to other campuses/cities
- Route-deviation detection (comparing live GPS against a planned route)

---

## 9. Environment Variables Checklist

Backend (`.env` in `/backend`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- (SMS provider key, if used)

Frontend (`.env` in `/frontend`):
- `VITE_SUPABASE_URL` (or `NEXT_PUBLIC_...` depending on framework choice)
- `VITE_SUPABASE_ANON_KEY`

⚠️ Add `.env` to `.gitignore` before the first commit.
