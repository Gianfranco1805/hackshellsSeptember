import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckInModal } from '../components/CheckInModal'
import { DemoControls } from '../components/DemoControls'
import { EscalationBanner } from '../components/EscalationBanner'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useCheckInTimer } from '../hooks/useCheckInTimer'
import { useWalkSession } from '../context/WalkSessionContext'

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function ActiveWalkPage() {
  const { session, loading, submitCheckIn, endWalk } = useWalkSession()
  const { secondsRemaining, isOverdue } = useCheckInTimer(session)
  const navigate = useNavigate()
  const [linkCopied, setLinkCopied] = useState(false)

  async function handleCopyLink() {
    if (!session) return
    await navigator.clipboard.writeText(`${window.location.origin}/contact/${session.session_id}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session || session.status === 'resolved') {
    return (
      <div className="mx-auto max-w-md px-4 pb-24 pt-6 text-center">
        <h1 className="mb-3 text-2xl font-semibold text-slate-900">No active walk</h1>
        <p className="mb-6 text-slate-600">Start a walk to begin check-ins.</p>
        <Button onClick={() => navigate('/start-walk')}>Start a walk</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Walk in progress</h1>

      <EscalationBanner level={session.current_level} />

      <div className="my-6 text-center">
        <p className="text-sm text-slate-500">Next check-in</p>
        <p className="text-4xl font-semibold tabular-nums text-slate-900">{formatSeconds(secondsRemaining)}</p>
      </div>

      <Button variant="secondary" onClick={endWalk}>
        End walk
      </Button>

      <Button variant="secondary" className="mt-3" onClick={handleCopyLink}>
        {linkCopied ? 'Link copied!' : 'Copy contact link'}
      </Button>

      <DemoControls />

      <CheckInModal open={isOverdue && session.current_level < 4} onConfirm={submitCheckIn} />
    </div>
  )
}
