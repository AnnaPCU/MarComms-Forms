import { createClient } from '@supabase/supabase-js'

// Both values are safe to expose in the browser: the publishable/anon key only grants
// what the Row Level Security policies in supabase/schema.sql allow (insert-only for
// respondents, read for signed-in admins).
// Accepts the VITE_ names from .env.example and the NEXT_PUBLIC_ names Supabase shows by default.
const env = import.meta.env
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const anonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const isConfigured = Boolean(url && anonKey)
export const supabase = isConfigured ? createClient(url, anonKey) : null

export const TABLE = 'responses'
