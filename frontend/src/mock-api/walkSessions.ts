import { delay, generateId, store, STORAGE_KEYS } from './client'
import type { EscalationLevel, PlannedRoute, WalkSession } from '../types'

// Everything in this file is a disposable, backend-owned-eventually
// simulation. When the real FastAPI escalation state machine + GPS check
// exist, this file's internals get replaced with `fetch` calls — callers in
// context/pages never change, since they only depend on the function
// signatures below.

// FIU-area anchor coordinate, jittered slightly per poll so the status view
// has something to render. Real GPS capture (who calls navigator.geolocation
// and how it reaches the backend) isn't specified by the role split in the
// handoff doc — not building that here, flagging for the backend teammate.
const ANCHOR_LAT = 25.758
const ANCHOR_LNG = -80.3733

const GRACE_WINDOW_SECONDS = 15

// Demo-only: a real route would take many real minutes to walk, far too slow
// to be visible in a short demo session, so the mock walker traverses the
// selected route over a fixed, short duration instead.
const DEMO_ROUTE_DURATION_SECONDS = 120

function jitteredCoord(base: number): number {
  return base + (Math.random() - 0.5) * 0.0015
}

function currentRoutePosition(session: WalkSession, now: number): { lat: number; lng: number } | null {
  const polyline = session.planned_route?.polyline
  if (!polyline || polyline.length === 0) return null

  const elapsedSeconds = (now - new Date(session.started_at).getTime()) / 1000
  const progress = Math.min(1, elapsedSeconds / DEMO_ROUTE_DURATION_SECONDS)
  const index = Math.floor(progress * (polyline.length - 1))
  const [lat, lng] = polyline[index]
  return { lat, lng }
}

// Assumption to confirm with the backend teammate: a confirmed check-in
// fully resets escalation to Level 1, not just extends the current level's
// clock.
function computeCurrentState(session: WalkSession, now: number): WalkSession {
  if (session.status !== 'active') return session

  const anchorTime = new Date(session.last_response_time ?? session.last_ping_time ?? session.started_at).getTime()
  const elapsedSeconds = (now - anchorTime) / 1000
  const interval = session.check_in_interval

  let level: EscalationLevel = 1
  if (elapsedSeconds < interval) {
    level = 1
  } else if (elapsedSeconds < interval + GRACE_WINDOW_SECONDS) {
    level = session.is_stationary ? 2 : 1
  } else if (elapsedSeconds < interval + GRACE_WINDOW_SECONDS * 2) {
    level = 2
  } else if (elapsedSeconds < interval + GRACE_WINDOW_SECONDS * 3) {
    level = 3
  } else {
    level = 4
  }

  const routePosition = currentRoutePosition(session, now)
  const baseLat = routePosition?.lat ?? session.last_known_lat ?? ANCHOR_LAT
  const baseLng = routePosition?.lng ?? session.last_known_lng ?? ANCHOR_LNG

  return {
    ...session,
    current_level: level,
    status: level === 4 ? 'escalated' : session.status,
    last_known_lat: jitteredCoord(baseLat),
    last_known_lng: jitteredCoord(baseLng),
    last_location_timestamp: new Date(now).toISOString(),
  }
}

function readAll(): WalkSession[] {
  return store.read<WalkSession>(STORAGE_KEYS.walkSessions)
}

function writeOne(session: WalkSession) {
  const all = readAll()
  const index = all.findIndex((s) => s.session_id === session.session_id)
  if (index === -1) all.push(session)
  else all[index] = session
  store.write(STORAGE_KEYS.walkSessions, all)
}

function getOrThrow(sessionId: string): WalkSession {
  const session = readAll().find((s) => s.session_id === sessionId)
  if (!session) throw new Error('Walk session not found')
  return session
}

export async function startWalk(input: {
  userId: string
  primaryContactId: string
  emergencyContactId: string
  checkInIntervalSeconds: number
  plannedRoute?: PlannedRoute | null
}): Promise<WalkSession> {
  await delay()
  const now = new Date().toISOString()
  const startLat = input.plannedRoute?.start_point.lat ?? ANCHOR_LAT
  const startLng = input.plannedRoute?.start_point.lng ?? ANCHOR_LNG
  const session: WalkSession = {
    session_id: generateId('walk'),
    user_id: input.userId,
    check_in_interval: input.checkInIntervalSeconds,
    current_level: 1,
    last_ping_time: now,
    last_response_time: now,
    last_known_lat: startLat,
    last_known_lng: startLng,
    last_location_timestamp: now,
    is_stationary: false,
    primary_contact_id: input.primaryContactId,
    emergency_contact_id: input.emergencyContactId,
    status: 'active',
    started_at: now,
    planned_route: input.plannedRoute ?? null,
  }
  writeOne(session)
  return session
}

export async function getSessionStatus(sessionId: string): Promise<WalkSession> {
  await delay(100, 250)
  const session = getOrThrow(sessionId)
  const updated = computeCurrentState(session, Date.now())
  writeOne(updated)
  return updated
}

export async function submitCheckIn(sessionId: string): Promise<WalkSession> {
  await delay()
  const session = getOrThrow(sessionId)
  const now = new Date().toISOString()
  const updated: WalkSession = {
    ...session,
    current_level: 1,
    status: 'active',
    last_response_time: now,
    last_ping_time: now,
  }
  writeOne(updated)
  return updated
}

export async function endWalk(sessionId: string): Promise<WalkSession> {
  await delay()
  const session = getOrThrow(sessionId)
  const updated: WalkSession = { ...session, status: 'resolved' }
  writeOne(updated)
  return updated
}

export async function getActiveSessionForUser(userId: string): Promise<WalkSession | null> {
  await delay(100, 200)
  const session = readAll()
    .filter((s) => s.user_id === userId && s.status !== 'resolved')
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
  if (!session) return null
  const updated = computeCurrentState(session, Date.now())
  writeOne(updated)
  return updated
}

// --- Demo-only helpers. Delete this block once the real backend exists. ---

export async function __forceMissedCheckIn(sessionId: string): Promise<WalkSession> {
  await delay(50, 100)
  const session = getOrThrow(sessionId)
  const pastAnchor = new Date(Date.now() - (session.check_in_interval + GRACE_WINDOW_SECONDS * 3 + 5) * 1000).toISOString()
  const updated: WalkSession = { ...session, last_response_time: pastAnchor, last_ping_time: pastAnchor }
  writeOne(updated)
  return getSessionStatus(sessionId)
}

export async function __toggleStationary(sessionId: string): Promise<WalkSession> {
  await delay(50, 100)
  const session = getOrThrow(sessionId)
  const updated: WalkSession = { ...session, is_stationary: !session.is_stationary }
  writeOne(updated)
  return updated
}

export async function __resetWalk(sessionId: string): Promise<WalkSession> {
  await delay(50, 100)
  const session = getOrThrow(sessionId)
  const now = new Date().toISOString()
  const updated: WalkSession = {
    ...session,
    current_level: 1,
    status: 'active',
    is_stationary: false,
    last_response_time: now,
    last_ping_time: now,
  }
  writeOne(updated)
  return updated
}
