import type { EscalationLevel, PlannedRoute } from '../types'

// The real backend deliberately has no "list my walks" endpoint (see
// BACKEND_INTEGRATION_HANDOFF.md) and only ever caches the *current* walk's
// metadata locally, clearing it once resolved. Past-walk history is
// therefore frontend-only for now: a compact record gets appended here the
// moment a walk ends, independent of the backend. This means history is
// per-device/browser, not synced across sessions -- acceptable for a demo,
// revisit if the backend ever grows a real history endpoint.

const STORAGE_KEY = 'walk_history'
const MAX_ENTRIES = 50

export interface WalkHistoryEntry {
  session_id: string
  user_id: string
  started_at: string
  ended_at: string
  current_level: EscalationLevel
  planned_route: PlannedRoute | null
}

function readEntries(): WalkHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as WalkHistoryEntry[]) : []
  } catch {
    return []
  }
}

export function recordCompletedWalk(entry: WalkHistoryEntry): void {
  const entries = [entry, ...readEntries().filter((e) => e.session_id !== entry.session_id)].slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function listCompletedWalks(userId: string): WalkHistoryEntry[] {
  return readEntries()
    .filter((e) => e.user_id === userId)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
}
