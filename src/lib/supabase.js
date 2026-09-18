import { createClient } from '@supabase/supabase-js'

// Both values are safe to expose in the browser: the anon key only grants what
// the Row Level Security policies in supabase/schema.sql allow (insert-only for
// respondents, read for signed-in admins).
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)
export const supabase = isConfigured ? createClient(url, anonKey) : null

export const TABLE = 'responses'
