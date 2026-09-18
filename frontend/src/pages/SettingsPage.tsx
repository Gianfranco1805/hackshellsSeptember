import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogoutIcon } from '../components/icons'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TextInput } from '../components/ui/TextInput'
import { useAuth } from '../context/AuthContext'
import { initials } from '../lib/format'

export function SettingsPage() {
  const { user, updateDisplayName, signOut } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    const { error } = await updateDisplayName(displayName.trim())
    setSaving(false)
    if (error) {
      setError(error)
    } else {
      setSaved(true)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-6 text-2xl font-semibold text-navy">Settings</h1>

      <Card className="mb-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-navy/10 text-base font-semibold text-navy">
            {initials(user?.display_name || user?.email || '?')}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-navy">{user?.display_name || 'Add your name'}</p>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextInput
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How should we greet you?"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">Saved.</p>}
          <Button type="submit" disabled={saving || displayName.trim() === (user?.display_name ?? '')}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </Card>

      <Card>
        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 text-left text-red-600">
          <LogoutIcon className="h-5 w-5" />
          <span className="font-medium">Log out</span>
        </button>
      </Card>
    </div>
  )
}
