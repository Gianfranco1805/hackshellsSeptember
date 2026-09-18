// Mock auth, deliberately shaped like supabase-js v2's real auth API
// (same method names/return shapes) so AuthContext swaps to `supabase.auth.*`
// later with no changes outside this file.

import { delay, generateId, store, STORAGE_KEYS } from './client'
import type { AppSession, AppUser } from '../types'

interface StoredUser extends AppUser {
  password: string
}

export interface AuthResult {
  data: { user: AppUser | null; session: AppSession | null }
  error: { message: string } | null
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 // 24h

function createSession(user: AppUser): AppSession {
  return {
    user,
    access_token: generateId('mock_token'),
    expires_at: Date.now() + SESSION_TTL_MS,
  }
}

function persistSession(session: AppSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session))
  } else {
    localStorage.removeItem(STORAGE_KEYS.session)
  }
}

const listeners = new Set<(event: string, session: AppSession | null) => void>()

export async function signUp(email: string, password: string): Promise<AuthResult> {
  await delay()
  const users = store.read<StoredUser>(STORAGE_KEYS.users)
  if (users.some((u) => u.email === email)) {
    return { data: { user: null, session: null }, error: { message: 'An account with this email already exists.' } }
  }
  const user: StoredUser = { id: generateId('user'), email, created_at: new Date().toISOString(), password }
  store.write(STORAGE_KEYS.users, [...users, user])
  const { password: _password, ...publicUser } = user
  const session = createSession(publicUser)
  persistSession(session)
  listeners.forEach((cb) => cb('SIGNED_IN', session))
  return { data: { user: publicUser, session }, error: null }
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  await delay()
  const users = store.read<StoredUser>(STORAGE_KEYS.users)
  const user = users.find((u) => u.email === email && u.password === password)
  if (!user) {
    return { data: { user: null, session: null }, error: { message: 'Invalid email or password.' } }
  }
  const { password: _password, ...publicUser } = user
  const session = createSession(publicUser)
  persistSession(session)
  listeners.forEach((cb) => cb('SIGNED_IN', session))
  return { data: { user: publicUser, session }, error: null }
}

export async function signOut(): Promise<{ error: { message: string } | null }> {
  await delay(100, 200)
  persistSession(null)
  listeners.forEach((cb) => cb('SIGNED_OUT', null))
  return { error: null }
}

export async function getSession(): Promise<{ data: { session: AppSession | null } }> {
  await delay(50, 150)
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session)
    if (!raw) return { data: { session: null } }
    const session = JSON.parse(raw) as AppSession
    if (session.expires_at < Date.now()) {
      persistSession(null)
      return { data: { session: null } }
    }
    return { data: { session } }
  } catch {
    return { data: { session: null } }
  }
}

export function onAuthStateChange(
  cb: (event: string, session: AppSession | null) => void,
): { data: { subscription: { unsubscribe: () => void } } } {
  listeners.add(cb)
  return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
}
