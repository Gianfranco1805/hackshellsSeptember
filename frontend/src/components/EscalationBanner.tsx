import { ESCALATION_LEVEL_META } from '../lib/constants'
import type { EscalationLevel } from '../types'

export function EscalationBanner({ level }: { level: EscalationLevel }) {
  const meta = ESCALATION_LEVEL_META[level]
  return (
    <div className={`rounded-xl border-2 p-4 ${meta.className}`}>
      <p className="font-semibold">{meta.label}</p>
      <p className="mt-1 text-sm">{meta.description}</p>
    </div>
  )
}
