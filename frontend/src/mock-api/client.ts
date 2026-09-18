// Small localStorage cache for walk-session metadata the real backend's
// WalkStatusOut doesn't echo back (the primary/emergency contact ids picked
// at start-walk time -- there's no GET /walks list endpoint, so this is also
// how the app finds "my active walk" again after a refresh).

export const STORAGE_KEYS = {
  activeWalkMeta: 'active_walk_meta',
} as const

export const store = {
  read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },
  write<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value))
  },
  remove(key: string): void {
    localStorage.removeItem(key)
  },
}
