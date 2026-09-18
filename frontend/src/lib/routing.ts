import L from 'leaflet'
import 'leaflet-routing-machine'
import { matchFiuLandmarks } from './fiuLandmarks'
import type { PlannedRoute, RoutePoint } from '../types'

// Free public Nominatim + OSRM servers — no API key, no billing, but shared
// demo infrastructure with light rate limits. Fine for a hackathon demo, not
// for production traffic.
//
// Routing specifically uses FOSSGIS's public OSRM instance (routed-foot),
// not router.project-osrm.org: that more commonly-cited demo server only has
// the driving profile compiled — 'foot', 'driving', and even a made-up
// profile name all silently return the same car-speed route. routed-foot
// has an actual pedestrian graph (footpaths, campus walkways, no highways).
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const OSRM_SERVICE_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1'
const FIU_ANCHOR = { lat: 25.758, lng: -80.3733 }
const REQUEST_TIMEOUT_MS = 8000

export class RoutingError extends Error {}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

function timeoutController(ms: number, externalSignal?: AbortSignal): AbortController {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), ms)
  externalSignal?.addEventListener('abort', () => controller.abort(), { once: true })
  controller.signal.addEventListener('abort', () => window.clearTimeout(timeoutId), { once: true })
  return controller
}

export async function searchPlaces(query: string, opts: { signal: AbortSignal }): Promise<RoutePoint[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) return []

  // A handful of FIU spots (parking garages especially) aren't well tagged
  // in OpenStreetMap and return zero Nominatim results by name, so check the
  // curated campus list first and merge it ahead of the geocoder's results.
  const landmarkMatches = matchFiuLandmarks(trimmed)

  const params = new URLSearchParams({
    format: 'jsonv2',
    q: trimmed,
    limit: '5',
    // Bias (not restrict) results toward South Florida.
    viewbox: `${FIU_ANCHOR.lng - 0.15},${FIU_ANCHOR.lat + 0.15},${FIU_ANCHOR.lng + 0.15},${FIU_ANCHOR.lat - 0.15}`,
    bounded: '0',
  })

  const controller = timeoutController(REQUEST_TIMEOUT_MS, opts.signal)

  let response: Response
  try {
    response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, { signal: controller.signal })
  } catch {
    if (opts.signal.aborted) return []
    if (landmarkMatches.length > 0) return landmarkMatches
    throw new RoutingError('Could not search for that place. Check your connection and try again.')
  }
  if (!response.ok) {
    if (landmarkMatches.length > 0) return landmarkMatches
    throw new RoutingError('Could not search for that place. Check your connection and try again.')
  }

  const results = (await response.json()) as NominatimResult[]
  const nominatimMatches = results.map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }))
  return [...landmarkMatches, ...nominatimMatches].slice(0, 5)
}

export async function fetchRoute(start: RoutePoint, end: RoutePoint): Promise<PlannedRoute> {
  const router = L.Routing.osrmv1({ serviceUrl: OSRM_SERVICE_URL, profile: 'foot' })
  const waypoints = [L.Routing.waypoint(L.latLng(start.lat, start.lng)), L.Routing.waypoint(L.latLng(end.lat, end.lng))]

  const routes = await new Promise<L.Routing.IRoute[]>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new RoutingError('Route lookup timed out. Try again.')), REQUEST_TIMEOUT_MS)
    router.route(waypoints, (error?: L.Routing.IError, foundRoutes?: L.Routing.IRoute[]) => {
      window.clearTimeout(timeoutId)
      if (error || !foundRoutes || foundRoutes.length === 0) {
        reject(new RoutingError('Could not find a walking route between those points.'))
        return
      }
      resolve(foundRoutes)
    })
  })

  const route = routes[0]
  if (!route.coordinates || !route.summary) {
    throw new RoutingError('Could not find a walking route between those points.')
  }

  return {
    start_point: start,
    end_point: end,
    polyline: route.coordinates.map((c) => [c.lat, c.lng] as [number, number]),
    distance_meters: route.summary.totalDistance,
    duration_seconds: route.summary.totalTime,
  }
}
