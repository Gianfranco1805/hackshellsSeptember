import L from 'leaflet'
import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import { endIcon, startIcon, walkerIcon } from '../../lib/leafletIcons'
import type { PlannedRoute } from '../../types'

const FIU_ANCHOR: [number, number] = [25.758, -80.3733]

interface WalkMapProps {
  route: PlannedRoute | null
  currentLat: number | null
  currentLng: number | null
}

function FitRouteBounds({ polyline }: { polyline: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(L.latLngBounds(polyline), { padding: [24, 24] })
  }, [map, polyline])
  return null
}

export function WalkMap({ route, currentLat, currentLng }: WalkMapProps) {
  const center: [number, number] = route
    ? route.polyline[0]
    : currentLat !== null && currentLng !== null
      ? [currentLat, currentLng]
      : FIU_ANCHOR

  return (
    <div className="my-6 h-64 overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer center={center} zoom={16} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route && (
          <>
            <FitRouteBounds polyline={route.polyline} />
            <Polyline positions={route.polyline} pathOptions={{ color: '#091f3f', weight: 4 }} />
            <Marker position={[route.start_point.lat, route.start_point.lng]} icon={startIcon} />
            <Marker position={[route.end_point.lat, route.end_point.lng]} icon={endIcon} />
          </>
        )}
        {currentLat !== null && currentLng !== null && <Marker position={[currentLat, currentLng]} icon={walkerIcon} />}
      </MapContainer>
    </div>
  )
}
