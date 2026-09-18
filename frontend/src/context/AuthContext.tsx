import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../mock-api'
import type { AppSession, AppUser } from '../types'

interface AuthContextValue {
  session: AppSession | null
  user: AppUser | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateDisplayName: (displayName: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = api.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string) {
    const { data, error } = await api.auth.signUp(email, password)
    if (data.session) setSession(data.session)
    return { error: error?.message ?? null }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await api.auth.signInWithPassword(email, password)
    if (data.session) setSession(data.session)
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await api.auth.signOut()
  }

  async function updateDisplayName(displayName: string) {
    const { data, error } = await api.auth.updateProfile(displayName)
    if (data.user) {
      setSession((prev) => (prev ? { ...prev, user: data.user! } : prev))
    }
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signUp, signIn, signOut, updateDisplayName }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
