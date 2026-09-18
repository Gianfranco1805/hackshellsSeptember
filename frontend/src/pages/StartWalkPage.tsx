import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import { useWalkSession } from '../context/WalkSessionContext'
import { INTERVAL_OPTIONS } from '../lib/constants'
import { api } from '../mock-api'
import type { Contact } from '../types'

export function StartWalkPage() {
  const { user } = useAuth()
  const { startWalk } = useWalkSession()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [primaryContactId, setPrimaryContactId] = useState('')
  const [emergencyContactId, setEmergencyContactId] = useState('')
  const [intervalSeconds, setIntervalSeconds] = useState(INTERVAL_OPTIONS[0].seconds)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!user) return
    api.contacts.listContacts(user.id).then((list) => {
      setContacts(list)
      setPrimaryContactId(list.find((c) => c.type === 'primary')?.id ?? '')
      setEmergencyContactId(list.find((c) => c.type === 'emergency')?.id ?? '')
      setLoading(false)
    })
  }, [user])

  const primaryOptions = contacts.filter((c) => c.type === 'primary')
  const emergencyOptions = contacts.filter((c) => c.type === 'emergency')
  const canStart = Boolean(primaryContactId && emergencyContactId)

  async function handleStart() {
    setStarting(true)
    await startWalk({ primaryContactId, emergencyContactId, checkInIntervalSeconds: intervalSeconds })
    setStarting(false)
    navigate('/walk')
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!canStart && primaryOptions.length === 0 && emergencyOptions.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 pb-24 pt-6 text-center">
        <h1 className="mb-3 text-2xl font-semibold text-slate-900">Start a walk</h1>
        <p className="text-slate-600">
          Add a primary and an emergency contact first on the Contacts tab, then come back here to start a walk.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Start a walk</h1>
      <div className="flex flex-col gap-4">
        <Select label="Primary contact" value={primaryContactId} onChange={(e) => setPrimaryContactId(e.target.value)}>
          <option value="" disabled>
            Select a contact
          </option>
          {primaryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select label="Emergency contact" value={emergencyContactId} onChange={(e) => setEmergencyContactId(e.target.value)}>
          <option value="" disabled>
            Select a contact
          </option>
          {emergencyOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          label="Check-in interval"
          value={intervalSeconds}
          onChange={(e) => setIntervalSeconds(Number(e.target.value))}
        >
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.seconds} value={opt.seconds}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Button onClick={handleStart} disabled={!canStart || starting}>
          {starting ? 'Starting…' : 'Start walk'}
        </Button>
      </div>
    </div>
  )
}
