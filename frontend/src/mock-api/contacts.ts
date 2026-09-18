import { apiDelete, apiGet, apiPost, apiPut } from '../lib/apiClient'
import type { Contact, ContactType } from '../types'

// The backend derives the owner from the JWT, not a body/query param -- the
// userId args below are kept only so callers (ContactsPage, StartWalkPage)
// don't need to change.

let cache: Contact[] | null = null

export async function listContacts(_userId: string): Promise<Contact[]> {
  cache = await apiGet<Contact[]>('/contacts')
  return cache
}

export async function addContact(
  _userId: string,
  input: { name: string; phone: string; type: ContactType },
): Promise<Contact> {
  const contact = await apiPost<Contact>('/contacts', input)
  cache = cache ? [...cache, contact] : [contact]
  return contact
}

export async function updateContact(
  id: string,
  updates: Partial<Pick<Contact, 'name' | 'phone'>>,
): Promise<Contact> {
  const contact = await apiPut<Contact>(`/contacts/${id}`, updates)
  cache = cache ? cache.map((c) => (c.id === id ? contact : c)) : [contact]
  return contact
}

export async function deleteContact(id: string): Promise<void> {
  await apiDelete(`/contacts/${id}`)
  cache = cache ? cache.filter((c) => c.id !== id) : null
}

export async function getContactById(id: string): Promise<Contact | null> {
  const hit = cache?.find((c) => c.id === id)
  if (hit) return hit
  const contacts = await listContacts('')
  return contacts.find((c) => c.id === id) ?? null
}
