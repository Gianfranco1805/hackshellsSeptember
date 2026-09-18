import { useState } from 'react'
import { isValidPhone } from '../lib/format'
import type { Contact } from '../types'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { TextInput } from './ui/TextInput'

interface ContactCardProps {
  contact: Contact
  onUpdate: (id: string, updates: { name: string; phone: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function ContactCard({ contact, onUpdate, onDelete }: ContactCardProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(contact.name)
  const [phone, setPhone] = useState(contact.phone)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number.')
      return
    }
    setError(null)
    setBusy(true)
    await onUpdate(contact.id, { name, phone })
    setBusy(false)
    setEditing(false)
  }

  async function handleDelete() {
    setBusy(true)
    await onDelete(contact.id)
  }

  if (editing) {
    return (
      <Card className="flex flex-col gap-3">
        <TextInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextInput label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            Save
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex items-center gap-3">
      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-navy/10 text-sm font-semibold text-navy">
        {initials(contact.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-navy">{contact.name}</p>
        <p className="truncate text-sm text-slate-600">{contact.phone}</p>
      </div>
      <div className="flex flex-none gap-3">
        <button type="button" className="text-sm font-medium text-navy" onClick={() => setEditing(true)} disabled={busy}>
          Edit
        </button>
        <button type="button" className="text-sm font-medium text-red-600" onClick={handleDelete} disabled={busy}>
          Delete
        </button>
      </div>
    </Card>
  )
}
