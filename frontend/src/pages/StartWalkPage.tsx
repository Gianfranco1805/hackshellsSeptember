import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoutePicker } from '../components/route/RoutePicker'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Spinner } from '../components/ui/Spinner'
import { TextInput } from '../components/ui/TextInput'
import { useAuth } from '../context/AuthContext'
import { useWalkSession } from '../context/WalkSessionContext'
import { api } from '../mock-api'
import type { Contact, PlannedRoute } from '../types'

const MIN_INTERVAL_SECONDS = 10

type IntervalUnit = 'seconds' | 'minutes'

export function StartWalkPage() {
  const { user } = useAuth()
  const { startWalk } = useWalkSession()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [primaryContactId, setPrimaryContactId] = useState('')
  const [emergencyContactId, setEmergencyContactId] = useState('')
  const [intervalValue, setIntervalValue] = useState(20)
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('seconds')
  const [starting, setStarting] = useState(false)
  const [plannedRoute, setPlannedRoute] = useState<PlannedRoute | null>(null)

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
  const intervalSeconds = intervalUnit === 'minutes' ? intervalValue * 60 : intervalValue
  const canStart = Boolean(primaryContactId && emergencyContactId && intervalSeconds >= MIN_INTERVAL_SECONDS)

  function handleUnitChange(unit: IntervalUnit) {
    if (unit === intervalUnit) return
    // Convert the typed value so the underlying seconds stay roughly the same across the unit switch.
    setIntervalValue(unit === 'minutes' ? Math.max(1, Math.round(intervalValue / 60)) : intervalValue * 60)
    setIntervalUnit(unit)
  }

  async function handleStart() {
    setStarting(true)
    await startWalk({ primaryContactId, emergencyContactId, checkInIntervalSeconds: intervalSeconds, plannedRoute })
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
        <h1 className="mb-3 text-2xl font-semibold text-navy">Start a walk</h1>
        <p className="mb-6 text-slate-600">
          Add a primary and an emergency contact first, then come back here to start a walk.
        </p>
        <Button onClick={() => navigate('/contacts')}>Go to Contacts</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-6 text-2xl font-semibold text-navy">Start a walk</h1>
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

        <RoutePicker onRouteChange={setPlannedRoute} />

        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextInput
                label="Check-in interval"
                type="number"
                min={intervalUnit === 'minutes' ? 1 : MIN_INTERVAL_SECONDS}
                step={intervalUnit === 'minutes' ? 1 : 5}
                value={intervalValue}
                onChange={(e) => setIntervalValue(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-1.5 pb-0.5">
              <Button
                type="button"
                size="pill"
                variant={intervalUnit === 'seconds' ? 'primary' : 'secondary'}
                onClick={() => handleUnitChange('seconds')}
              >
                Sec
              </Button>
              <Button
                type="button"
                size="pill"
                variant={intervalUnit === 'minutes' ? 'primary' : 'secondary'}
                onClick={() => handleUnitChange('minutes')}
              >
                Min
              </Button>
            </div>
          </div>
          {intervalSeconds < MIN_INTERVAL_SECONDS && (
            <p className="mt-1 text-sm text-red-600">Interval must be at least {MIN_INTERVAL_SECONDS} seconds.</p>
          )}
        </div>

        <Button onClick={handleStart} disabled={!canStart || starting}>
          {starting ? 'Starting…' : 'Start walk'}
        </Button>
      </div>
    </div>
  )
}
