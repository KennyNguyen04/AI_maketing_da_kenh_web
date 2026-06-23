import { createClient } from '@/lib/supabase/server'

export async function getCurrentUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, user_plan, created_at')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
}

export async function requireAdmin() {
  const { supabase, user, profile } = await getCurrentUserProfile()

  if (!user) {
    return { supabase, user: null, profile: null, error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (profile?.user_plan !== 'admin') {
    return { supabase, user, profile, error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user, profile, error: null }
}
