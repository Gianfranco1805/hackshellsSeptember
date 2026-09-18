import { useState, type FormEvent } from 'react'
import type { ContactType } from '../types'
import { Button } from './ui/Button'
import { Select } from './ui/Select'
import { TextInput } from './ui/TextInput'

interface ContactFormProps {
  type: ContactType
  onSubmit: (input: { name: string; phone: string; type: ContactType }) => Promise<void>
}

export function ContactForm({ type, onSubmit }: ContactFormProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit({ name, phone, type })
    setSubmitting(false)
    setName('')
    setPhone('')
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <TextInput label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
      <TextInput label="Phone number" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Button type="submit" variant="secondary" disabled={submitting}>
        {submitting ? 'Saving…' : `Add ${type === 'primary' ? 'primary' : 'emergency'} contact`}
      </Button>
    </form>
  )
}
