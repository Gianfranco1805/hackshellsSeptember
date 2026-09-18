import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/TextInput'
import { useAuth } from '../context/AuthContext'

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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextInput
          label="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How should we greet you?"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Saved.</p>}
        <Button type="submit" disabled={saving || displayName.trim() === (user?.display_name ?? '')}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-500">Signed in as {user?.email}</p>

      <button type="button" className="mt-10 text-sm font-medium text-slate-500" onClick={handleLogout}>
        Log out
      </button>
    </div>
  )
}
