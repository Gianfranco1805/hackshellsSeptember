export type ContactType = 'primary' | 'emergency'

export interface Contact {
  id: string
  user_id: string
  name: string
  phone: string
  type: ContactType
  created_at: string
}

export type EscalationLevel = 1 | 2 | 3 | 4

export type WalkStatus = 'active' | 'resolved' | 'escalated'

export interface RoutePoint {
  label: string
  lat: number
  lng: number
}

export interface PlannedRoute {
  start_point: RoutePoint
  end_point: RoutePoint
  polyline: [number, number][] // [lat, lng], ordered start -> end
  distance_meters: number
  duration_seconds: number
}

export interface WalkSession {
  session_id: string
  user_id: string
  check_in_interval: number // seconds
  current_level: EscalationLevel
  last_ping_time: string | null
  last_response_time: string | null
  last_known_lat: number | null
  last_known_lng: number | null
  last_location_timestamp: string | null
  is_stationary: boolean
  primary_contact_id: string
  emergency_contact_id: string
  status: WalkStatus
  started_at: string
  seconds_until_next_escalation?: number | null
  alert_summary?: string | null
  share_url?: string | null
  // Frontend-only: the backend has no concept of a planned route, so this is
  // cached locally alongside the contact ids (see mock-api/walkSessions.ts)
  // purely for the map display -- real GPS still drives actual position.
  planned_route: PlannedRoute | null
}

export interface AppUser {
  id: string
  email: string
  display_name: string | null
  created_at: string
}

export interface AppSession {
  user: AppUser
  access_token: string
  expires_at: number
}
