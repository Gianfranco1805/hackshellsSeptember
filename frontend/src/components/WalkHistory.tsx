import { useAuth } from '../context/AuthContext'
import { formatDuration, formatWalkDateTime } from '../lib/format'
import { listCompletedWalks, type WalkHistoryEntry } from '../lib/walkHistory'
import type { EscalationLevel } from '../types'
import { Card } from './ui/Card'

const OUTCOME_DOT_CLASS: Record<EscalationLevel, string> = {
  1: 'bg-slate-400',
  2: 'bg-amber-500',
  3: 'bg-orange-500',
  4: 'bg-red-500',
}

function outcomeLabel(level: EscalationLevel): string {
  return level === 1 ? 'No issues' : `Escalated to Level ${level}`
}

function WalkRow({ walk }: { walk: WalkHistoryEntry }) {
  const duration = formatDuration(new Date(walk.ended_at).getTime() - new Date(walk.started_at).getTime())

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-navy">{formatWalkDateTime(walk.started_at)}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 flex-none rounded-full ${OUTCOME_DOT_CLASS[walk.current_level]}`} />
          <p className="truncate text-xs text-slate-500">{outcomeLabel(walk.current_level)}</p>
        </div>
      </div>
      <p className="flex-none text-sm text-slate-500">{duration}</p>
    </div>
  )
}

export function WalkHistory() {
  const { user } = useAuth()
  if (!user) return null

  const walks = listCompletedWalks(user.id)
  if (walks.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-semibold text-navy">Past walks</h2>
      <Card className="divide-y divide-slate-100">
        {walks.map((walk) => (
          <WalkRow key={walk.session_id} walk={walk} />
        ))}
      </Card>
    </section>
  )
}
