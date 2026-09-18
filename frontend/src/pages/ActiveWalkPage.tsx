import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckInModal } from '../components/CheckInModal'
import { DemoControls } from '../components/DemoControls'
import { EscalationBanner } from '../components/EscalationBanner'
import { ShieldIcon } from '../components/icons'
import { WalkMap } from '../components/route/WalkMap'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import { useWalkSession } from '../context/WalkSessionContext'
import { useCheckInTimer } from '../hooks/useCheckInTimer'
import { api } from '../mock-api'
import type { AppUser, WalkSession } from '../types'

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

// Reports the level reached at the moment the walk was ended, not the peak
// level reached at any point during the walk — the mock model doesn't keep
// a level history.
function useNotifiedContactNames(session: WalkSession | null): string[] {
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    if (!session || session.status !== 'resolved' || session.current_level < 2) {
      setNames([])
      return
    }
    const ids =
      session.current_level >= 3
        ? [session.primary_contact_id, session.emergency_contact_id]
        : [session.primary_contact_id]
    Promise.all(ids.map((id) => api.contacts.getContactById(id))).then((contacts) => {
      setNames(contacts.filter((c) => c !== null).map((c) => c.name))
    })
  }, [session])

  return names
}

function greetingName(user: AppUser | null): string {
  if (!user) return 'there'
  return user.display_name ?? user.email.split('@')[0]
}

export function ActiveWalkPage() {
  const { user } = useAuth()
  const { session, loading, resolvedAt, submitCheckIn, endWalk, clearEndedWalk } = useWalkSession()
  const { secondsRemaining, isOverdue } = useCheckInTimer(session)
  const navigate = useNavigate()
  const [emergencyContactCount, setEmergencyContactCount] = useState<number | null>(null)
  const notifiedNames = useNotifiedContactNames(session)

  useEffect(() => {
    if (!user || session) return
    api.contacts.listContacts(user.id).then((list) => {
      setEmergencyContactCount(list.filter((c) => c.type === 'emergency').length)
    })
  }, [user, session])

  function handleStartNew() {
    clearEndedWalk()
    navigate('/start-walk')
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (session && session.status === 'resolved') {
    const duration = resolvedAt ? resolvedAt - new Date(session.started_at).getTime() : null
    return (
      <div className="mx-auto max-w-md px-4 pb-24 pt-6 text-center">
        <h1 className="mb-3 text-2xl font-semibold text-navy">Walk ended</h1>
        <p className="mb-1 text-slate-600">
          {duration !== null ? `Lasted ${formatDuration(duration)}. ` : ''}
          Final status: {session.current_level >= 4 ? 'Level 4' : `Level ${session.current_level}`}.
        </p>
        {notifiedNames.length > 0 && (
          <p className="mb-6 text-slate-600">Notified: {notifiedNames.join(', ')}.</p>
        )}
        {notifiedNames.length === 0 && <div className="mb-6" />}
        <Button onClick={handleStartNew}>Start a new walk</Button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 pb-24 pt-6">
        <h1 className="mb-1 text-2xl font-semibold text-navy">Hi, {greetingName(user)}</h1>
        <p className="mb-6 text-slate-600">
          {emergencyContactCount === null
            ? 'Ready when you are.'
            : emergencyContactCount > 0
              ? `${emergencyContactCount} emergency contact${emergencyContactCount === 1 ? '' : 's'} on file.`
              : 'Add an emergency contact before you head out.'}
        </p>

        <div className="rounded-3xl bg-navy p-6 text-center text-white">
          <ShieldIcon className="mx-auto mb-3 h-10 w-10 text-gold" />
          <h2 className="mb-1 text-lg font-semibold">Ready to head out?</h2>
          <p className="mb-5 text-sm text-white/80">Start a walk and we'll check in with you along the way.</p>
          <Button variant="accent" onClick={() => navigate('/start-walk')}>
            Start a walk
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-6 text-2xl font-semibold text-navy">Walk in progress</h1>

      <EscalationBanner level={session.current_level} />

      <div className="my-6 text-center">
        <p className="text-sm text-slate-500">Next check-in</p>
        <p className="text-4xl font-semibold tabular-nums text-navy">{formatSeconds(secondsRemaining)}</p>
      </div>

      <WalkMap route={session.planned_route} currentLat={session.last_known_lat} currentLng={session.last_known_lng} />

      <Button onClick={endWalk}>End walk</Button>

      <DemoControls />

      <CheckInModal open={isOverdue && session.current_level < 4} onConfirm={submitCheckIn} />
    </div>
  )
}
