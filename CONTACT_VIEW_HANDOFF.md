# Contact-Facing View — Build Guide

> **Update:** the route and param name below were corrected from an earlier version of this doc (`/contact/:sessionId` → `/status/:shareToken`) to match how the real backend actually builds the contact link. If you already started on the old path, just rename it — the rest of this guide is unaffected.

This is your piece of the Safety Walking Companion app (see `PROJECT_HANDOFF.md` for the full picture). When a walk escalates to Level 2 or 3, the walker's primary/emergency contact gets a link. This is the page that link opens: it shows the walker's last known location, current status, and a plain-language summary — plus the simulated Level 4 "would now escalate to emergency services" screen.

You're building this inside the same frontend app the rest of the team is using (`frontend/`), so you get routing, styling, and a working mock data layer for free instead of starting from scratch. Follow the steps below in order — each one is small and independently testable, so commit as you finish each one.

**Workflow**: branch off `main` (e.g. `git checkout -b contact-view`), commit as you complete each step, and open a PR back to `main` when ready. Open the PR early — even right after step 2 — so review happens in small pieces instead of one big diff at the end. The frontend teammate will review and merge.

## Step 0 — Setup check

```
git clone <repo-url>
cd hackshellsSeptember/frontend
npm install
npm run dev
```

Open the URL it prints (probably `http://localhost:5173`). You should see the existing app's login screen. If that works, you're set up correctly — don't move on until this loads.

## Step 1 — Placeholder route

Open `frontend/src/router/AppRouter.tsx`. Every existing route in there is wrapped in `<ProtectedRoute>` — **don't do that for yours**. Contacts aren't logged into this app; your page has to work for someone who just clicks a link with no account.

Add a new route:

```tsx
<Route path="/status/:shareToken" element={<ContactViewPage />} />
```

Create `frontend/src/pages/ContactViewPage.tsx`:

```tsx
import { useParams } from 'react-router-dom'

export function ContactViewPage() {
  const { shareToken } = useParams()
  return <p>Contact view for: {shareToken}</p>
}
```

Import it in `AppRouter.tsx` and add the route above. Run the app, navigate to `http://localhost:5173/status/anything` — you should see your placeholder text. That proves routing works before you write any real logic.

## Step 2 — Real data, no styling yet

The team already built a mock data layer that stands in for the real backend. You use it the same way. In `ContactViewPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../mock-api'
import type { WalkSession } from '../types'

export function ContactViewPage() {
  const { shareToken } = useParams()
  const [session, setSession] = useState<WalkSession | null>(null)

  useEffect(() => {
    if (!shareToken) return
    api.walkSessions.getSessionStatus(shareToken).then(setSession)
  }, [shareToken])

  if (!session) return <p>Loading…</p>

  return <pre>{JSON.stringify(session, null, 2)}</pre>
}
```

Note: for now, in the mock layer, that "share token" is really just the walk session's internal id underneath — good enough to build and test against. Once the real backend is wired in, this call swaps to a proper unauthenticated public endpoint keyed by a real share token; that swap is the frontend engineer's job, not yours — nothing about your page changes.

**To test this you need a real id.** Easiest way right now: open the app, sign up, add a primary + emergency contact, start a walk. Then open the browser devtools console and run:

```js
JSON.parse(localStorage.getItem('mock_walk_sessions'))
```

Copy the `session_id` value and use it in the URL: `/status/<that-id>`. You should see the raw session data dumped on the page. (Once the "copy contact link" button lands elsewhere in the app, this gets a lot easier — you'll just paste a copied link directly.)

## Step 3 — Reuse the existing level display

Don't build your own "what does level 2 mean" text/colors — it already exists and the walker's own screen uses it. Reuse it so your page stays visually consistent for free:

```tsx
import { EscalationBanner } from '../components/EscalationBanner'
// ...
<EscalationBanner level={session.current_level} />
```

That component pulls its copy and color from `frontend/src/lib/constants.ts` (`ESCALATION_LEVEL_META`) — take a look at that file to see what each level says.

## Step 4 — Location, the simple way

Don't reach for a maps SDK or API key under time pressure. Just show the coordinates as a link to Google Maps:

```tsx
<a
  href={`https://www.google.com/maps?q=${session.last_known_lat},${session.last_known_lng}`}
  target="_blank"
  rel="noreferrer"
>
  Open last known location in Maps
</a>
```

## Step 5 — Mocked summary text

The real version of this text comes from a Gemini API call the backend teammate owns — that doesn't exist yet. For now, write a small local function that fakes it, clearly marked as a placeholder:

```tsx
// TODO: replace with real Gemini-generated summary from the backend
function mockSummary(session: WalkSession): string {
  if (session.current_level === 1) return 'Everything looks normal.'
  const minutesStationary = session.is_stationary ? 'and has not moved ' : ''
  return `She hasn't responded to a check-in recently ${minutesStationary}— this may be unusual based on her walk so far.`
}
```

Render `mockSummary(session)` somewhere near the top of the page, above the location link.

## Step 6 — Your own piece: the Level 4 screen

This is explicitly yours — a self-contained, simulated "would now escalate to emergency services" screen. When `session.current_level === 4`, show a distinct full-screen state instead of the normal layout. Make it visually unmistakable that this is a demo:

```tsx
if (session.current_level === 4) {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h1>Emergency services would now be contacted</h1>
      <p>This is a demo. No real call or text has been made.</p>
    </div>
  )
}
```

Feel free to style this properly with Tailwind classes once it works — look at how other pages in `frontend/src/pages/` use `className` for examples.

## Step 7 — Stretch goal (optional, only if steps 1–6 are solid)

Right now your page loads the session once and never updates. If there's time, make it poll like the walker's own screen does — call `api.walkSessions.getSessionStatus(shareToken)` again every few seconds with `setInterval` so the contact sees status changes without refreshing manually. Look at `frontend/src/context/WalkSessionContext.tsx` for the pattern (it does exactly this).

## Questions / stuck?

Ping the frontend teammate — happier to unblock you early than review a huge diff at the end.
