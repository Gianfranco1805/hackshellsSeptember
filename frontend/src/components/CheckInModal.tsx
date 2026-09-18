import { Button } from './ui/Button'

interface CheckInModalProps {
  open: boolean
  onConfirm: () => void
}

export function CheckInModal({ open, onConfirm }: CheckInModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-lg">
        <h2 className="mb-2 text-xl font-semibold text-navy">Are you okay?</h2>
        <p className="mb-6 text-sm text-slate-600">Tap to confirm you're safe and reset your check-in timer.</p>
        <Button onClick={onConfirm}>I'm okay</Button>
      </div>
    </div>
  )
}
