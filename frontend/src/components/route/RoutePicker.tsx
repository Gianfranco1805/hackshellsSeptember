import { useEffect, useState } from 'react'
import { fetchRoute } from '../../lib/routing'
import type { PlannedRoute, RoutePoint } from '../../types'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { PlaceSearchField } from './PlaceSearchField'
import { RouteMapCanvas } from './RouteMapCanvas'

type ArmedField = 'start' | 'end' | null

interface RoutePickerProps {
  onRouteChange: (route: PlannedRoute | null) => void
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  return minutes < 1 ? '<1 min' : `${minutes} min`
}

function PointField({
  label,
  point,
  onClear,
  onSelect,
}: {
  label: string
  point: RoutePoint | null
  onClear: () => void
  onSelect: (point: RoutePoint) => void
}) {
  if (point) {
    return (
      <div className="text-left">
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-2xl border border-slate-300 px-3 py-2">
          <span className="truncate text-sm text-slate-700">{point.label}</span>
          <button type="button" onClick={onClear} className="shrink-0 text-sm font-medium text-navy">
            Change
          </button>
        </div>
      </div>
    )
  }
  return <PlaceSearchField label={label} placeholder="Search a place…" onSelect={onSelect} />
}

export function RoutePicker({ onRouteChange }: RoutePickerProps) {
  const [startPoint, setStartPoint] = useState<RoutePoint | null>(null)
  const [endPoint, setEndPoint] = useState<RoutePoint | null>(null)
  const [armedField, setArmedField] = useState<ArmedField>(null)
  const [plannedRoute, setPlannedRoute] = useState<PlannedRoute | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)

  useEffect(() => {
    if (!startPoint || !endPoint) {
      setPlannedRoute(null)
      setRouteError(null)
      onRouteChange(null)
      return
    }
    let cancelled = false
    setRouteLoading(true)
    setRouteError(null)
    fetchRoute(startPoint, endPoint)
      .then((route) => {
        if (cancelled) return
        setPlannedRoute(route)
        onRouteChange(route)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPlannedRoute(null)
        onRouteChange(null)
        setRouteError(err instanceof Error ? err.message : 'Could not fetch a route.')
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [startPoint, endPoint, onRouteChange])

  function handleMapClick(lat: number, lng: number) {
    if (!armedField) return
    const point: RoutePoint = { label: `Pinned location (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng }
    if (armedField === 'start') setStartPoint(point)
    else setEndPoint(point)
    setArmedField(null)
  }

  function handleClearRoute() {
    setStartPoint(null)
    setEndPoint(null)
    setArmedField(null)
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-navy">Plan your route (optional)</h2>
        <p className="text-sm text-slate-500">Search a place or set a pin directly on the map.</p>
      </div>

      <PointField label="Start" point={startPoint} onClear={() => setStartPoint(null)} onSelect={setStartPoint} />
      <PointField label="Destination" point={endPoint} onClear={() => setEndPoint(null)} onSelect={setEndPoint} />

      <div className="flex gap-2">
        <Button
          type="button"
          size="pill"
          variant={armedField === 'start' ? 'primary' : 'secondary'}
          onClick={() => setArmedField(armedField === 'start' ? null : 'start')}
        >
          Set start on map
        </Button>
        <Button
          type="button"
          size="pill"
          variant={armedField === 'end' ? 'primary' : 'secondary'}
          onClick={() => setArmedField(armedField === 'end' ? null : 'end')}
        >
          Set destination on map
        </Button>
      </div>

      <RouteMapCanvas
        startPoint={startPoint}
        endPoint={endPoint}
        polyline={plannedRoute?.polyline ?? null}
        armedField={armedField}
        onMapClick={handleMapClick}
      />

      {routeLoading && <p className="text-sm text-slate-500">Finding a walking route…</p>}
      {routeError && <p className="text-sm text-red-600">{routeError}</p>}
      {plannedRoute && !routeLoading && (
        <p className="text-sm text-slate-600">
          {formatDistance(plannedRoute.distance_meters)} · about {formatDuration(plannedRoute.duration_seconds)} walking
        </p>
      )}

      {(startPoint || endPoint) && (
        <Button type="button" variant="secondary" size="pill" onClick={handleClearRoute}>
          Clear route
        </Button>
      )}
    </Card>
  )
}
