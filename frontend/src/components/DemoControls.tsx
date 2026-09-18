import { useState } from 'react'
import { useWalkSession } from '../context/WalkSessionContext'

// Dev-only aid for demoing the escalation flow without waiting out real
// timers. Safe to delete before final polish — not a shipped feature.
export function DemoControls() {
  const { session, forceMissedCheckIn, toggleStationary, resetWalk } = useWalkSession()
  const [open, setOpen] = useState(false)

  if (!session) return null

  return (
    <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-3">
      <button
        type="button"
        className="text-sm font-medium text-slate-500"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide' : 'Show'} demo mode
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-slate-500">Stationary: {session.is_stationary ? 'yes' : 'no'}</p>
          <button type="button" className="text-sm text-violet-600" onClick={toggleStationary}>
            Toggle stationary
          </button>
          <button type="button" className="text-sm text-violet-600" onClick={forceMissedCheckIn}>
            Force missed check-in
          </button>
          <button type="button" className="text-sm text-violet-600" onClick={resetWalk}>
            Reset walk
          </button>
        </div>
      )}
    </div>
  )
}
