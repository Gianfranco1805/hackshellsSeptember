import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet'
import { endIcon, startIcon } from '../../lib/leafletIcons'
import type { RoutePoint } from '../../types'

const FIU_CENTER: [number, number] = [25.758, -80.3733]

interface RouteMapCanvasProps {
  startPoint: RoutePoint | null
  endPoint: RoutePoint | null
  polyline: [number, number][] | null
  armedField: 'start' | 'end' | null
  onMapClick: (lat: number, lng: number) => void
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function RouteMapCanvas({ startPoint, endPoint, polyline, armedField, onMapClick }: RouteMapCanvasProps) {
  return (
    <div>
      <div
        className={`h-64 overflow-hidden rounded-2xl border ${armedField ? 'border-navy ring-2 ring-navy-light/30' : 'border-slate-200'}`}
      >
        <MapContainer center={FIU_CENTER} zoom={15} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={onMapClick} />
          {startPoint && <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon} />}
          {endPoint && <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon} />}
          {polyline && <Polyline positions={polyline} pathOptions={{ color: '#091f3f', weight: 4 }} />}
        </MapContainer>
      </div>
      {armedField && (
        <p className="mt-1 text-center text-xs text-slate-500">Tap the map to set the {armedField === 'start' ? 'start' : 'destination'}.</p>
      )}
    </div>
  )
}
