import { ApiError, apiGet, apiPost } from '../lib/apiClient'
import { supabase } from '../lib/supabaseClient'
import { store, STORAGE_KEYS } from './client'
import type { EscalationLevel, WalkSession, WalkStatus } from '../types'

// The real backend's WalkStatusOut/PublicWalkStatusOut (see backend/app/schemas.py).
// Kept local -- these are wire shapes, not something the rest of the app should
// depend on directly.

interface WalkStatusOut {
  id: string
  status: WalkStatus
  current_level: number
  is_stationary: boolean
  check_in_interval_seconds: number
  started_at: string
  last_ping_time: string
  last_response_time: string | null
  last_known_lat: number | null
  last_known_lng: number | null
  last_location_timestamp: string | null
  seconds_until_next_escalation: number | null
  alert_summary: string | null
  share_url: string | null
}

interface PublicWalkStatusOut {
  status: WalkStatus
  current_level: number
  is_stationary: boolean
  last_known_lat: number | null
  last_known_lng: number | null
  last_location_timestamp: string | null
  minutes_into_walk: number
  alert_summary: string | null
}

// The backend has no "list my active walks" endpoint (by design, see
// BACKEND_INTEGRATION_HANDOFF.md) and WalkStatusOut doesn't echo back the
// contact ids chosen at start-walk time -- this local cache fills both gaps.
interface StoredMeta {
  walkId: string
  userId: string
  primaryContactId: string
  emergencyContactId: string
}

function readMeta(): StoredMeta | null {
  return store.read<StoredMeta>(STORAGE_KEYS.activeWalkMeta)
}

function writeMeta(meta: StoredMeta) {
  store.write(STORAGE_KEYS.activeWalkMeta, meta)
}

function clearMeta() {
  store.remove(STORAGE_KEYS.activeWalkMeta)
}

function mapWalkStatus(status: WalkStatusOut, meta: StoredMeta | null): WalkSession {
  return {
    session_id: status.id,
    user_id: meta?.userId ?? '',
    check_in_interval: status.check_in_interval_seconds,
    current_level: status.current_level as EscalationLevel,
    last_ping_time: status.last_ping_time,
    last_response_time: status.last_response_time,
    last_known_lat: status.last_known_lat,
    last_known_lng: status.last_known_lng,
    last_location_timestamp: status.last_location_timestamp,
    is_stationary: status.is_stationary,
    primary_contact_id: meta?.primaryContactId ?? '',
    emergency_contact_id: meta?.emergencyContactId ?? '',
    status: status.status,
    started_at: status.started_at,
    seconds_until_next_escalation: status.seconds_until_next_escalation,
    alert_summary: status.alert_summary,
    share_url: status.share_url,
  }
}

// The public link carries a share_token, not the walk's internal id, and the
// sanitized PublicWalkStatusOut omits ids/contacts entirely (no PII) -- this
// is used by the unauthenticated contact-view page.
function mapPublicStatus(shareToken: string, status: PublicWalkStatusOut): WalkSession {
  return {
    session_id: shareToken,
    user_id: '',
    check_in_interval: 0,
    current_level: status.current_level as EscalationLevel,
    last_ping_time: null,
    last_response_time: null,
    last_known_lat: status.last_known_lat,
    last_known_lng: status.last_known_lng,
    last_location_timestamp: status.last_location_timestamp,
    is_stationary: status.is_stationary,
    primary_contact_id: '',
    emergency_contact_id: '',
    status: status.status,
    started_at: new Date(Date.now() - status.minutes_into_walk * 60_000).toISOString(),
    alert_summary: status.alert_summary,
  }
}

export async function startWalk(input: {
  primaryContactId: string
  emergencyContactId: string
  checkInIntervalSeconds: number
}): Promise<WalkSession> {
  const status = await apiPost<WalkStatusOut>('/walks/start', {
    primary_contact_id: input.primaryContactId,
    emergency_contact_id: input.emergencyContactId,
    check_in_interval_seconds: input.checkInIntervalSeconds,
  })
  const { data } = await supabase.auth.getSession()
  const meta: StoredMeta = {
    walkId: status.id,
    userId: data.session?.user.id ?? '',
    primaryContactId: input.primaryContactId,
    emergencyContactId: input.emergencyContactId,
  }
  writeMeta(meta)
  return mapWalkStatus(status, meta)
}

// Authenticated poll of the walker's own session.
export async function getWalkStatus(walkId: string): Promise<WalkSession> {
  const status = await apiGet<WalkStatusOut>(`/walks/${walkId}/status`)
  return mapWalkStatus(status, readMeta())
}

// Unauthenticated poll via the public contact link -- used by ContactViewPage.
export async function getSessionStatus(shareToken: string): Promise<WalkSession> {
  const status = await apiGet<PublicWalkStatusOut>(`/public/walks/${shareToken}/status`, false)
  return mapPublicStatus(shareToken, status)
}

export async function submitCheckIn(walkId: string): Promise<WalkSession> {
  const status = await apiPost<WalkStatusOut>(`/walks/${walkId}/checkin`)
  return mapWalkStatus(status, readMeta())
}

export async function reportLocation(walkId: string, lat: number, lng: number): Promise<WalkSession> {
  const status = await apiPost<WalkStatusOut>(`/walks/${walkId}/location`, { lat, lng })
  return mapWalkStatus(status, readMeta())
}

export async function endWalk(walkId: string): Promise<WalkSession> {
  const meta = readMeta()
  try {
    const status = await apiPost<WalkStatusOut>(`/walks/${walkId}/resolve`)
    clearMeta()
    return mapWalkStatus(status, meta)
  } catch (err) {
    // Backend rejects a second resolve with 400 -- treat it as already-ended
    // instead of surfacing an error, same never-block-the-flow philosophy the
    // backend itself follows for Gemini/SMS failures.
    if (err instanceof ApiError && err.status === 400) {
      const status = await apiGet<WalkStatusOut>(`/walks/${walkId}/status`)
      clearMeta()
      return mapWalkStatus(status, meta)
    }
    throw err
  }
}

export async function getActiveSessionForUser(): Promise<WalkSession | null> {
  const meta = readMeta()
  if (!meta) return null
  try {
    const status = await apiGet<WalkStatusOut>(`/walks/${meta.walkId}/status`)
    if (status.status === 'resolved') {
      clearMeta()
      return null
    }
    return mapWalkStatus(status, meta)
  } catch {
    clearMeta()
    return null
  }
}
