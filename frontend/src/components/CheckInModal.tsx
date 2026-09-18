import { Button } from './ui/Button'
import { EscalationBanner } from './EscalationBanner'
import type { EscalationLevel } from '../types'

interface CheckInModalProps {
  open: boolean
  level: EscalationLevel
  onConfirm: () => void
}

// This overlay covers the page (including the EscalationBanner underneath)
// exactly when a missed check-in is escalating the walk -- show the same
// banner here too so a raised level is never hidden from the walker.
export function CheckInModal({ open, level, onConfirm }: CheckInModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-lg">
        <div className="mb-4 text-left">
          <EscalationBanner level={level} />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-navy">Are you okay?</h2>
        <p className="mb-6 text-sm text-slate-600">Tap to confirm you're safe and reset your check-in timer.</p>
        <Button onClick={onConfirm}>I'm okay</Button>
      </div>
    </div>
  )
}
