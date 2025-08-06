import { createClient } from '@supabase/supabase-js'
import { env } from '~/env'

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
)

// Server-side client with service role key
export const supabaseAdmin = createClient(
  env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
  env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

// Database tables types (will be generated from Supabase)
export interface User {
  id: string
  clerk_id: string
  email: string
  username: string
  first_name?: string
  last_name?: string
  timezone?: string
  created_at: string
  updated_at: string
}

export interface MeetingType {
  id: string
  user_id: string
  name: string
  duration_minutes: number
  description?: string
  location_type: 'zoom' | 'google_meet' | 'phone' | 'in_person'
  location_details?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface Booking {
  id: string
  meeting_type_id: string
  invitee_name: string
  invitee_email: string
  invitee_phone?: string
  scheduled_time: string
  status: 'confirmed' | 'cancelled'
  cancellation_reason?: string
  created_at: string
  updated_at: string
}