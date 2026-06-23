import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client — uses SERVICE_ROLE_KEY to bypass RLS.
 * ONLY use in server-side background workers (Inngest functions).
 * Never expose this to the client.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
