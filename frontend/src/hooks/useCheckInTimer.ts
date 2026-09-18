import { useEffect, useState } from 'react'
import type { WalkSession } from '../types'

export function useCheckInTimer(session: WalkSession | null): { secondsRemaining: number; isOverdue: boolean } {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!session) return { secondsRemaining: 0, isOverdue: false }

  const anchorTime = new Date(session.last_response_time ?? session.last_ping_time ?? session.started_at).getTime()
  const elapsedSeconds = (now - anchorTime) / 1000
  const remaining = Math.max(0, Math.ceil(session.check_in_interval - elapsedSeconds))

  return { secondsRemaining: remaining, isOverdue: elapsedSeconds >= session.check_in_interval }
}
