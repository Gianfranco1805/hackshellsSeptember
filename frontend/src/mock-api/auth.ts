// Real Supabase Auth, kept behind the same function signatures/shapes the
// mock version used (which were deliberately modeled on supabase-js v2's own
// API) so AuthContext.tsx needed zero changes for this swap.

import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { AppSession, AppUser } from '../types'

export interface AuthResult {
  data: { user: AppUser | null; session: AppSession | null }
  error: { message: string } | null
}

function mapUser(user: SupabaseUser): AppUser {
  return { id: user.id, email: user.email ?? '', created_at: user.created_at }
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
  const { data, error } = await supabase.auth.signUp({ email, password })
  return {
    data: { user: data.user ? mapUser(data.user) : null, session: mapSession(data.session) },
    error: error ? { message: error.message } : null,
  }
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return {
    data: { user: data.user ? mapUser(data.user) : null, session: mapSession(data.session) },
    error: error ? { message: error.message } : null,
  }
}

export async function signOut(): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.auth.signOut()
  return { error: error ? { message: error.message } : null }
}

export async function getSession(): Promise<{ data: { session: AppSession | null } }> {
  const { data } = await supabase.auth.getSession()
  return { data: { session: mapSession(data.session) } }
}

export function onAuthStateChange(
  cb: (event: string, session: AppSession | null) => void,
): { data: { subscription: { unsubscribe: () => void } } } {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    cb(event, mapSession(session))
  })
  return { data: { subscription } }
}
