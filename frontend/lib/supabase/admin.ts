import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client — uses SERVICE_ROLE_KEY to bypass RLS.
 * ONLY use in server-side background workers (Inngest functions).
 * Never expose this to the client.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for admin client')
}
if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client')
}

export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})