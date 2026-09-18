import type { RoutePoint } from '../types'

// Nominatim's OpenStreetMap data doesn't have every FIU campus building
// tagged (or tagged under a name students actually search for), so specific
// spots like "Parking Garage 6" return zero search results even though the
// map tiles render fine and clicking the spot directly always works.
// Coordinates sourced from FIU's own campus map (campusmaps.fiu.edu), not
// OSM, to fill that gap for the handful of spots people actually search by
// name.
interface FiuLandmark {
  label: string
  aliases: string[]
  lat: number
  lng: number
}

const FIU_LANDMARKS: FiuLandmark[] = [
  { label: 'Gold Parking Garage (PG1)', aliases: ['pg1', 'gold garage', 'parking garage 1'], lat: 25.754816909831646, lng: -80.37210450809611 },
  { label: 'Blue Parking Garage (PG2)', aliases: ['pg2', 'blue garage', 'parking garage 2'], lat: 25.753867060692258, lng: -80.3720965656414 },
  { label: 'Panther Parking Garage (PG3)', aliases: ['pg3', 'panther garage', 'parking garage 3'], lat: 25.758476977878182, lng: -80.37981737232003 },
  { label: 'Red Parking Garage (PG4)', aliases: ['pg4', 'red garage', 'parking garage 4'], lat: 25.760152735332234, lng: -80.37316819374954 },
  {
    label: 'Market Station Parking Garage (PG5)',
    aliases: ['pg5', 'market station', 'parking garage 5'],
    lat: 25.760161016120655,
    lng: -80.3716808193895,
  },
  { label: 'Tech Station Parking Garage (PG6)', aliases: ['pg6', 'tech station', 'parking garage 6'], lat: 25.76017578634999, lng: -80.3745445782759 },
  { label: 'Steve and Dorothea Green Library', aliases: ['green library', 'gl'], lat: 25.756894107141612, lng: -80.37387653158146 },
  { label: 'Graham Center (GC)', aliases: ['gc', 'graham center', 'student union'], lat: 25.756321645817515, lng: -80.37292332800449 },
  { label: 'Everglades Residence Hall', aliases: ['everglades hall', 'eh'], lat: 25.75377554729342, lng: -80.37540494722255 },
  { label: 'Lakeview Hall North', aliases: ['lvn', 'lakeview north'], lat: 25.754331628851883, lng: -80.37466193516128 },
  { label: 'Lakeview Hall South', aliases: ['lvs', 'lakeview south'], lat: 25.75402965686369, lng: -80.3744661339032 },
  { label: 'Panther Residence Hall', aliases: ['ph', 'panther hall'], lat: 25.754285513973727, lng: -80.37670080045069 },
  { label: 'Parkview Hall', aliases: ['pvh'], lat: 25.7542712982187, lng: -80.3775367236646 },
  { label: 'Tamiami Hall', aliases: ['tam'], lat: 25.7528952954082, lng: -80.37569137842145 },
]

export function matchFiuLandmarks(query: string): RoutePoint[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return FIU_LANDMARKS.filter((landmark) => landmark.label.toLowerCase().includes(q) || landmark.aliases.some((alias) => alias.includes(q) || q.includes(alias)))
    .map((landmark) => ({ label: landmark.label, lat: landmark.lat, lng: landmark.lng }))
}
