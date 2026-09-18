import { ESCALATION_LEVEL_META } from '../lib/constants'
import type { EscalationLevel } from '../types'
import { AlertIcon, ShieldIcon } from './icons'

export function EscalationBanner({ level }: { level: EscalationLevel }) {
  const meta = ESCALATION_LEVEL_META[level]
  const Icon = level === 1 ? ShieldIcon : AlertIcon
  return (
    <div className={`flex items-start gap-3 rounded-3xl border-2 p-5 ${meta.className}`}>
      <Icon className="mt-0.5 h-7 w-7 flex-none" />
      <div>
        <p className="font-semibold">{meta.label}</p>
        <p className="mt-1 text-sm">{meta.description}</p>
      </div>
    </div>
  )
}
