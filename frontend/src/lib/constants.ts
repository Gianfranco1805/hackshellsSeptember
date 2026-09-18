import type { EscalationLevel } from '../types'

export const INTERVAL_OPTIONS = [
  { label: '20 seconds (demo)', seconds: 20 },
  { label: '5 minutes', seconds: 5 * 60 },
  { label: '10 minutes', seconds: 10 * 60 },
  { label: '15 minutes', seconds: 15 * 60 },
] as const

export const ESCALATION_LEVEL_META: Record<
  EscalationLevel,
  { label: string; description: string; className: string }
> = {
  1: {
    label: 'Level 1 — Checked in',
    description: "You're all set. We'll check in with you again soon.",
    className: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  2: {
    label: 'Level 2 — Primary contact notified',
    description: 'Your primary contact has been alerted that you missed a check-in.',
    className: 'bg-amber-100 text-amber-800 border-amber-400',
  },
  3: {
    label: 'Level 3 — Emergency contact notified',
    description: "Your emergency contact has been alerted. We're still trying to reach you.",
    className: 'bg-orange-100 text-orange-800 border-orange-500',
  },
  4: {
    label: 'Level 4 — Would now escalate to emergency services',
    description:
      'This is a demo — in a real deployment, emergency services would now be contacted. No real call or text is made.',
    className: 'bg-red-100 text-red-800 border-red-500',
  },
}
