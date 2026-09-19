# Safety Walking Companion

A safety walking companion for women navigating Miami (FIU as the anchor community), built around a tiered check-in escalation system. Built for the EmpowHER Hackathon.

The walker sets a check-in interval when she starts a walk. If she misses a check-in, the backend checks whether she's still moving — staying stationary speeds up escalation. Escalation runs through four levels: (1) self check-in ping, (2) primary contact notified, (3) emergency contact notified, (4) a simulated "would now escalate to emergency services" screen (never a real call, by design). When it escalates, Gemini generates a plain-language summary of the situation, and the contact gets a text with an Apple/Google Maps link — no app install required on their end.

See [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md) for the full product spec and escalation logic.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS, React Router |
| Maps | Leaflet / react-leaflet + leaflet-routing-machine |
| Backend | Python, FastAPI |
| Database + Auth | Supabase (Postgres) |
| AI | Gemini API — escalation alert summaries |
| SMS alerts | TextBelt |
| Hosting | Frontend on Vercel, backend on Render (`render.yaml`) |

## Repo structure

```
/frontend    React + TypeScript app (Vite)
/backend     FastAPI app
```

### Frontend (`/frontend/src`)

- `pages/` — `LoginPage`, `SignUpPage`, `ContactsPage`, `StartWalkPage`, `ActiveWalkPage`, `ContactViewPage` (public link view), `SettingsPage`
- `router/AppRouter.tsx` — route definitions
- `components/` — shared UI (`ui/`) and route/map components (`route/`)
- `context/`, `hooks/`, `lib/` — app state, custom hooks, Supabase client and helpers
- `mock-api/` — local mocks for frontend development without the backend running

### Backend (`/backend/app`)

- `main.py` — FastAPI app entrypoint
- `routers/` — `contacts.py`, `walks.py` (authenticated), `public.py` (contact-link view, no auth)
- `services/` — `session_service.py` (escalation state machine), `escalation.py` (stillness/level logic), `gemini_service.py`, `textbelt_service.py`, `geo.py`
- `db.py`, `dependencies.py`, `config.py`, `schemas.py`
- `supabase/schema.sql` — database schema

Full backend details (auth model, endpoints, Gemini/TextBelt fallback behavior) are in [`backend/README.md`](./backend/README.md).

## Getting started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in Supabase, Gemini, TextBelt values
uvicorn app.main:app --reload --port 8000
```

Run `backend/supabase/schema.sql` against your Supabase project (Dashboard → SQL Editor).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env        # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

## Scope decisions

- No native contacts picker — contacts are entered manually and saved to the account.
- No real emergency services integration — Level 4 is simulated/visual only.
- No realtime/websockets — location and status updates via polling only.
- Real auth via Supabase; contacts are protected behind login.
