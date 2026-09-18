import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '../mock-api'
import type { WalkSession } from '../types'
import { useAuth } from './AuthContext'

const POLL_INTERVAL_MS = 3000

interface WalkSessionContextValue {
  session: WalkSession | null
  loading: boolean
  resolvedAt: number | null
  startWalk: (input: { primaryContactId: string; emergencyContactId: string; checkInIntervalSeconds: number }) => Promise<void>
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

  const clearPoll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const pollStatus = useCallback((sessionId: string) => {
    clearPoll()
    pollRef.current = window.setInterval(async () => {
      const updated = await api.walkSessions.getSessionStatus(sessionId)
      setSession(updated)
      if (updated.status !== 'active') clearPoll()
    }, POLL_INTERVAL_MS)
  }, [clearPoll])

  useEffect(() => {
    if (!user) {
      setSession(null)
      setLoading(false)
      return
    }
    api.walkSessions.getActiveSessionForUser(user.id).then((active) => {
      setSession(active)
      setLoading(false)
      if (active && active.status === 'active') pollStatus(active.session_id)
    })
    return () => clearPoll()
  }, [user, pollStatus, clearPoll])

  async function startWalk(input: { primaryContactId: string; emergencyContactId: string; checkInIntervalSeconds: number }) {
    if (!user) return
    const created = await api.walkSessions.startWalk({ userId: user.id, ...input })
    setSession(created)
    setResolvedAt(null)
    pollStatus(created.session_id)
  }

  async function submitCheckIn() {
    if (!session) return
    const updated = await api.walkSessions.submitCheckIn(session.session_id)
    setSession(updated)
  }

  async function endWalk() {
    if (!session) return
    const updated = await api.walkSessions.endWalk(session.session_id)
    setSession(updated)
    setResolvedAt(Date.now())
    clearPoll()
  }

  function clearEndedWalk() {
    setSession(null)
    setResolvedAt(null)
  }

  async function forceMissedCheckIn() {
    if (!session) return
    setSession(await api.walkSessions.__forceMissedCheckIn(session.session_id))
  }

  async function toggleStationary() {
    if (!session) return
    setSession(await api.walkSessions.__toggleStationary(session.session_id))
  }

  async function resetWalk() {
    if (!session) return
    setSession(await api.walkSessions.__resetWalk(session.session_id))
    pollStatus(session.session_id)
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
