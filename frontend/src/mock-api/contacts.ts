import { delay, generateId, store, STORAGE_KEYS } from './client'
import type { Contact, ContactType } from '../types'

export async function listContacts(userId: string): Promise<Contact[]> {
  await delay()
  return store.read<Contact>(STORAGE_KEYS.contacts).filter((c) => c.user_id === userId)
}

export async function addContact(
  userId: string,
  input: { name: string; phone: string; type: ContactType },
): Promise<Contact> {
  await delay()
  const contacts = store.read<Contact>(STORAGE_KEYS.contacts)
  const contact: Contact = {
    id: generateId('contact'),
    user_id: userId,
    name: input.name,
    phone: input.phone,
    type: input.type,
    created_at: new Date().toISOString(),
  }
  store.write(STORAGE_KEYS.contacts, [...contacts, contact])
  return contact
}

export async function updateContact(
  id: string,
  updates: Partial<Pick<Contact, 'name' | 'phone'>>,
): Promise<Contact> {
  await delay()
  const contacts = store.read<Contact>(STORAGE_KEYS.contacts)
  const index = contacts.findIndex((c) => c.id === id)
  if (index === -1) throw new Error('Contact not found')
  const updated = { ...contacts[index], ...updates }
  contacts[index] = updated
  store.write(STORAGE_KEYS.contacts, contacts)
  return updated
}

export async function deleteContact(id: string): Promise<void> {
  await delay()
  const contacts = store.read<Contact>(STORAGE_KEYS.contacts)
  store.write(
    STORAGE_KEYS.contacts,
    contacts.filter((c) => c.id !== id),
  )
}
