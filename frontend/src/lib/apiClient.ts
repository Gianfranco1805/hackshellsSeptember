// Thin fetch wrapper for the real FastAPI backend. Every authenticated call
// attaches the current Supabase session's JWT as a Bearer token -- fetched
// fresh each call (not cached) since a walk can outlive a short-lived token
// and supabase-js keeps it refreshed under the hood.

import { supabase } from './supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : `Request failed with status ${status}`)
    this.status = status
    this.detail = detail
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options: RequestInit, auth: boolean): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(auth ? await authHeaders() : {}),
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const body = text ? JSON.parse(text) : undefined

  if (!res.ok) {
    throw new ApiError(res.status, body?.detail ?? body)
  }

  return body as T
}

export function apiGet<T>(path: string, auth = true): Promise<T> {
  return request<T>(path, { method: 'GET' }, auth)
}

export function apiPost<T>(path: string, body?: unknown, auth = true): Promise<T> {
  return request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }, auth)
}

export function apiPut<T>(path: string, body?: unknown, auth = true): Promise<T> {
  return request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }, auth)
}

export function apiDelete<T = void>(path: string, auth = true): Promise<T> {
  return request<T>(path, { method: 'DELETE' }, auth)
}
