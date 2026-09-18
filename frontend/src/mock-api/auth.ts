import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js'
import { isConfigured, supabase } from '../lib/supabaseClient'
import type { AppSession, AppUser } from '../types'
import { delay, generateId, store, STORAGE_KEYS } from './client'

interface StoredUser extends AppUser {
  password: string
}

export interface AuthResult {
  data: { user: AppUser | null; session: AppSession | null }
  error: { message: string } | null
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 // 24h

function createMockSession(user: AppUser): AppSession {
  return {
    user,
    access_token: generateId('mock_token'),
    expires_at: Date.now() + SESSION_TTL_MS,
  }
}

function persistMockSession(session: AppSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session))
  } else {
    localStorage.removeItem(STORAGE_KEYS.session)
  }
}

const mockListeners = new Set<(event: string, session: AppSession | null) => void>()

function mapUser(user: SupabaseUser): AppUser {
  return {
    id: user.id,
    email: user.email ?? '',
    display_name: user.user_metadata?.display_name ?? null,
    created_at: user.created_at,
  }
}

function mapSession(session: SupabaseSession | null): AppSession | null {
  if (!session) return null
  return {
    user: mapUser(session.user),
    access_token: session.access_token,
    expires_at: session.expires_at ?? 0,
  }
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (!error && (data.user || data.session)) {
        return {
          data: { user: data.user ? mapUser(data.user) : null, session: mapSession(data.session) },
          error: null,
        }
      }
      if (error) {
        return { data: { user: null, session: null }, error: { message: error.message } }
      }
    } catch {
      // Fallback to mock auth if network/Supabase call fails
    }
  }

  // Local mock auth
  await delay()
  const users = store.read<StoredUser>(STORAGE_KEYS.users)
  if (users.some((u) => u.email === email)) {
    return { data: { user: null, session: null }, error: { message: 'An account with this email already exists.' } }
  }
  const user: StoredUser = { id: generateId('user'), email, created_at: new Date().toISOString(), password }
  store.write(STORAGE_KEYS.users, [...users, user])
  const { password: _password, ...publicUser } = user
  const session = createMockSession(publicUser)
  persistMockSession(session)
  mockListeners.forEach((cb) => cb('SIGNED_IN', session))
  return { data: { user: publicUser, session }, error: null }
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (isConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error && (data.user || data.session)) {
        return {
          data: { user: data.user ? mapUser(data.user) : null, session: mapSession(data.session) },
          error: null,
        }
      }
      if (error) {
        return { data: { user: null, session: null }, error: { message: error.message } }
      }
    } catch {
      // Fallback to mock auth if network/Supabase call fails
    }
  }

  // Local mock auth
  await delay()
  const users = store.read<StoredUser>(STORAGE_KEYS.users)
  const user = users.find((u) => u.email === email && u.password === password)
  if (!user) {
    return { data: { user: null, session: null }, error: { message: 'Invalid email or password.' } }
  }
  const { password: _password, ...publicUser } = user
  const session = createMockSession(publicUser)
  persistMockSession(session)
  mockListeners.forEach((cb) => cb('SIGNED_IN', session))
  return { data: { user: publicUser, session }, error: null }
}

export async function updateProfile(displayName: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName } })
  return {
    data: { user: data.user ? mapUser(data.user) : null, session: null },
    error: error ? { message: error.message } : null,
  }
}

export async function signOut(): Promise<{ error: { message: string } | null }> {
  if (isConfigured && supabase) {
    try {
      const { error } = await supabase.auth.signOut()
      if (!error) return { error: null }
    } catch {
      // ignore
    }
  }

  await delay(100, 200)
  persistMockSession(null)
  mockListeners.forEach((cb) => cb('SIGNED_OUT', null))
  return { error: null }
}

export async function getSession(): Promise<{ data: { session: AppSession | null } }> {
  if (isConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        return { data: { session: mapSession(data.session) } }
      }
    } catch {
      // ignore
    }
  }

  await delay(50, 150)
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session)
    if (!raw) return { data: { session: null } }
    const session = JSON.parse(raw) as AppSession
    if (session.expires_at < Date.now()) {
      persistMockSession(null)
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
  if (isConfigured && supabase) {
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        cb(event, mapSession(session))
      })
      return { data: { subscription } }
    } catch {
      // ignore
    }
  }

  mockListeners.add(cb)
  return { data: { subscription: { unsubscribe: () => mockListeners.delete(cb) } } }
}
