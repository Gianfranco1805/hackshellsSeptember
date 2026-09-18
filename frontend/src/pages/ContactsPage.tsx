import { useEffect, useState, type ReactNode } from 'react'
import { ContactCard } from '../components/ContactCard'
import { ContactForm } from '../components/ContactForm'
import { AlertIcon, ContactsIcon } from '../components/icons'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import { api } from '../mock-api'
import type { Contact, ContactType } from '../types'

function SectionHeader({ icon, tone, title, subtitle }: { icon: ReactNode; tone: 'navy' | 'gold'; title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div
        className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${
          tone === 'navy' ? 'bg-navy/10 text-navy' : 'bg-gold/15 text-gold'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-navy">{title}</h2>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">{icon}</div>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  )
}

export function ContactsPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    api.contacts.listContacts(user.id).then((list) => {
      setContacts(list)
      setLoading(false)
    })
  }, [user])

  async function handleAdd(input: { name: string; phone: string; type: ContactType }) {
    if (!user) return
    const created = await api.contacts.addContact(user.id, input)
    setContacts((prev) => [...prev, created])
  }

  async function handleUpdate(id: string, updates: { name: string; phone: string }) {
    const updated = await api.contacts.updateContact(id, updates)
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)))
  }

  async function handleDelete(id: string) {
    await api.contacts.deleteContact(id)
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const primary = contacts.filter((c) => c.type === 'primary')
  const emergency = contacts.filter((c) => c.type === 'emergency')

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6">
      <h1 className="mb-1 text-2xl font-semibold text-navy">Contacts</h1>
      <p className="mb-6 text-sm text-slate-500">Who we reach out to if a walk doesn't go as planned.</p>

      <section className="mb-8">
        <SectionHeader
          icon={<ContactsIcon className="h-4 w-4" />}
          tone="navy"
          title="Primary contact"
          subtitle="Notified first when you miss a check-in."
        />
        <div className="mb-4 flex flex-col gap-3">
          {primary.length === 0 && <EmptyState icon={<ContactsIcon className="h-5 w-5" />} text="No primary contact saved yet." />}
          {primary.map((c) => (
            <ContactCard key={c.id} contact={c} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
        {primary.length === 0 && <ContactForm type="primary" onSubmit={handleAdd} />}
      </section>

      <section>
        <SectionHeader
          icon={<AlertIcon className="h-4 w-4" />}
          tone="gold"
          title="Emergency contact"
          subtitle="Notified if you still haven't responded."
        />
        <div className="mb-4 flex flex-col gap-3">
          {emergency.length === 0 && <EmptyState icon={<AlertIcon className="h-5 w-5" />} text="No emergency contact saved yet." />}
          {emergency.map((c) => (
            <ContactCard key={c.id} contact={c} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
        {emergency.length === 0 && <ContactForm type="emergency" onSubmit={handleAdd} />}
      </section>
    </div>
  )
}
