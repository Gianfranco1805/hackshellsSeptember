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
}

export interface AppUser {
  id: string
  email: string
  created_at: string
}

export interface AppSession {
  user: AppUser
  access_token: string
  expires_at: number
}
