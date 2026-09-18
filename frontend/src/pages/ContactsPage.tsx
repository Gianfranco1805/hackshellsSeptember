import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ContactCard } from '../components/ContactCard'
import { ContactForm } from '../components/ContactForm'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import { api } from '../mock-api'
import type { Contact, ContactType } from '../types'

export function ContactsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
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

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
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
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Contacts</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-slate-800">Primary contact</h2>
        <div className="mb-4 flex flex-col gap-3">
          {primary.length === 0 && <p className="text-sm text-slate-500">No primary contact saved yet.</p>}
          {primary.map((c) => (
            <ContactCard key={c.id} contact={c} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
        {primary.length === 0 && <ContactForm type="primary" onSubmit={handleAdd} />}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-800">Emergency contact</h2>
        <div className="mb-4 flex flex-col gap-3">
          {emergency.length === 0 && <p className="text-sm text-slate-500">No emergency contact saved yet.</p>}
          {emergency.map((c) => (
            <ContactCard key={c.id} contact={c} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
        {emergency.length === 0 && <ContactForm type="emergency" onSubmit={handleAdd} />}
      </section>

      <button type="button" className="mt-10 text-sm font-medium text-slate-500" onClick={handleLogout}>
        Log out
      </button>
    </div>
  )
}
