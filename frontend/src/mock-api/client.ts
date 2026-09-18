// Mock-only persistence layer. When the real backend exists, this whole file
// is deleted — nothing outside mock-api/ imports it directly.

export function delay(minMs = 250, maxMs = 500): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

function readCollection<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeCollection<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

export const store = {
  read: readCollection,
  write: writeCollection,
}

export const STORAGE_KEYS = {
  users: 'mock_users',
  session: 'mock_session',
  contacts: 'mock_contacts',
  walkSessions: 'mock_walk_sessions',
} as const
