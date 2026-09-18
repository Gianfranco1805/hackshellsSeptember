import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { recordCompletedWalk } from '../lib/walkHistory'
import { api } from '../mock-api'
import type { PlannedRoute, WalkSession } from '../types'
import { useAuth } from './AuthContext'

const POLL_INTERVAL_MS = 3000
const LOCATION_REPORT_INTERVAL_MS = 15000

interface WalkSessionContextValue {
  session: WalkSession | null
  loading: boolean
  resolvedAt: number | null
  startWalk: (input: {
    primaryContactId: string
    emergencyContactId: string
    checkInIntervalSeconds: number
    plannedRoute?: PlannedRoute | null
  }) => Promise<void>
  submitCheckIn: () => Promise<void>
  endWalk: () => Promise<void>
  clearEndedWalk: () => void
  forceMissedCheckIn: () => Promise<void>
  toggleStationary: () => Promise<void>
  resetWalk: () => Promise<void>
}

const WalkSessionContext = createContext<WalkSessionContextValue | null>(null)

export function WalkSessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [session, setSession] = useState<WalkSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolvedAt, setResolvedAt] = useState<number | null>(null)
  const pollRef = useRef<number | null>(null)
  const locationRef = useRef<number | null>(null)

  const clearPoll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const pollStatus = useCallback((walkId: string) => {
    clearPoll()
    pollRef.current = window.setInterval(async () => {
      try {
        const updated = await api.walkSessions.getWalkStatus(walkId)
        setSession(updated)
        if (updated.status !== 'active') clearPoll()
      } catch (err) {
        // A transient failure shouldn't freeze the interval or the UI --
        // just skip this tick and try again on the next one.
        console.error('Failed to poll walk status', err)
      }
    }, POLL_INTERVAL_MS)
  }, [clearPoll])

  const clearLocationReporting = useCallback(() => {
    if (locationRef.current !== null) {
      window.clearInterval(locationRef.current)
      locationRef.current = null
    }
  }, [])

  // GPS pings feed the backend's stillness check (see PROJECT_HANDOFF.md
  // section 4) -- without them a walk never reports movement and escalation
  // timing degrades to elapsed-silence only.
  const startLocationReporting = useCallback((walkId: string) => {
    clearLocationReporting()
    if (!navigator.geolocation) return
    const report = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          api.walkSessions.reportLocation(walkId, position.coords.latitude, position.coords.longitude).catch(() => {
            // Never block the walk on a failed location report.
          })
        },
        () => {
          // Permission denied or unavailable -- escalation still runs off
          // elapsed silence alone.
        },
        { enableHighAccuracy: true, timeout: 8000 },
      )
    }
    report()
    locationRef.current = window.setInterval(report, LOCATION_REPORT_INTERVAL_MS)
  }, [clearLocationReporting])

  useEffect(() => {
    if (!user) {
      setSession(null)
      setLoading(false)
      return
    }
    api.walkSessions.getActiveSessionForUser().then((active) => {
      setSession(active)
      setLoading(false)
      if (active && active.status === 'active') {
        pollStatus(active.session_id)
        startLocationReporting(active.session_id)
      }
    })
    return () => {
      clearPoll()
      clearLocationReporting()
    }
  }, [user, pollStatus, clearPoll, startLocationReporting, clearLocationReporting])

  async function startWalk(input: {
    primaryContactId: string
    emergencyContactId: string
    checkInIntervalSeconds: number
    plannedRoute?: PlannedRoute | null
  }) {
    if (!user) return
    const created = await api.walkSessions.startWalk(input)
    setSession(created)
    setResolvedAt(null)
    pollStatus(created.session_id)
    startLocationReporting(created.session_id)
  }

  async function submitCheckIn() {
    if (!session) return
    const updated = await api.walkSessions.submitCheckIn(session.session_id)
    setSession(updated)
  }

  async function endWalk() {
    if (!session || !user) return
    const updated = await api.walkSessions.endWalk(session.session_id)
    recordCompletedWalk({
      session_id: updated.session_id,
      user_id: user.id,
      started_at: updated.started_at,
      ended_at: new Date().toISOString(),
      current_level: updated.current_level,
      planned_route: updated.planned_route,
    })
    setSession(updated)
    setResolvedAt(Date.now())
    clearPoll()
    clearLocationReporting()
  }

  function clearEndedWalk() {
    setSession(null)
    setResolvedAt(null)
  }

  async function forceMissedCheckIn() {
    if (!session) return
    setSession(await api.walkSessions.forceMissedCheckIn(session.session_id))
  }

  async function toggleStationary() {
    if (!session) return
    setSession(await api.walkSessions.toggleStationary(session.session_id, !session.is_stationary))
  }

  async function resetWalk() {
    if (!session) return
    setSession(await api.walkSessions.resetWalk(session.session_id))
  }

  return (
    <WalkSessionContext.Provider
      value={{
        session,
        loading,
        resolvedAt,
        startWalk,
        submitCheckIn,
        endWalk,
        clearEndedWalk,
        forceMissedCheckIn,
        toggleStationary,
        resetWalk,
      }}
    >
      {children}
    </WalkSessionContext.Provider>
  )
}

export function useWalkSession(): WalkSessionContextValue {
  const ctx = useContext(WalkSessionContext)
  if (!ctx) throw new Error('useWalkSession must be used within a WalkSessionProvider')
  return ctx
}
