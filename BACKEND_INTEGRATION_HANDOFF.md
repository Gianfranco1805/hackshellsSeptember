# Backend Integration Handoff

The backend scaffold (`backend/`) looks solid — real Supabase queries for contacts/walks, a real escalation state machine, and a real Gemini call with a fallback. Nice work. This isn't asking for new feature work; it's the short list of infrastructure prerequisites needed before the frontend can swap its mock data layer for real calls to this API.

## What's needed

1. **Confirm/provision a real Supabase project**, with `backend/supabase/schema.sql` applied to it. Wasn't able to tell from the repo alone whether a live project already exists or if the schema file is still just sitting there unapplied — let me know either way.
2. **Share two values** (not the service key — that stays backend-only):
   - `SUPABASE_URL`
   - The Supabase **anon** key
   
   The frontend already has placeholders waiting for these in `frontend/.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — it'll call `supabase-js` directly for Auth, not through the backend.
3. **Run the backend somewhere reachable.** Localhost + port is totally fine for now (e.g. `http://localhost:8000`) — just tell me the base URL you're running it at. Render deploy can wait until closer to demo day.
4. **Create 1-2 test Supabase Auth users** via the Supabase dashboard, so both of us can test against a real JWT instead of building auth flows against each other ad hoc.

## Things I looked at and decided NOT to ask for

- **No "list my active walks" endpoint needed.** I noticed there's no `GET /walks` or similar — but the frontend doesn't need it. It already knows the session id the moment it calls `POST /walks/start` and can just cache that id locally (same pattern the current mock layer already uses), then hit `GET /walks/{id}/status` directly. No endpoint change needed on your end for this.
- **Two minor edge cases exist, not blocking**: `DELETE /contacts/{id}` doesn't 404 on a non-existent id, and `POST /walks/{id}/resolve` doesn't guard against double-resolving. Not worth your time right now — flagging only so it's not a surprise later.
- **Alert/SMS delivery** — your README already calls this out as an open team decision, not implemented yet. Not re-raising it here; that's a separate conversation whenever we get to it.

Once the above four items are in place, I'll handle wiring the frontend's `mock-api/` layer over to real calls on my end — that's not something you need to do.
