import { useEffect, useState } from 'react'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { searchPlaces } from '../../lib/routing'
import type { RoutePoint } from '../../types'
import { TextInput } from '../ui/TextInput'

interface PlaceSearchFieldProps {
  label: string
  placeholder?: string
  onSelect: (point: RoutePoint) => void
}

export function PlaceSearchField({ label, placeholder, onSelect }: PlaceSearchFieldProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RoutePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query, 400)

  useEffect(() => {
    if (debouncedQuery.trim().length < 3) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    searchPlaces(debouncedQuery, { signal: controller.signal })
      .then((found) => {
        setResults(found)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Search failed.')
        setResults([])
        setLoading(false)
      })
    return () => controller.abort()
  }, [debouncedQuery])

  function handleSelect(point: RoutePoint) {
    onSelect(point)
    setQuery('')
    setResults([])
  }

  return (
    <div className="relative">
      <TextInput label={label} placeholder={placeholder} value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
      {loading && <p className="mt-1 text-sm text-slate-500">Searching…</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {results.length > 0 && (
        <ul className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          {results.map((point, i) => (
            <li key={`${point.lat}-${point.lng}-${i}`}>
              <button
                type="button"
                onClick={() => handleSelect(point)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {point.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
