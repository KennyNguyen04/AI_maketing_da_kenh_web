import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from('repurpose_jobs')
    .select('id, user_id, title, source_type, channels, status, error_message, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(100)

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 })
  }

  const userIds = [...new Set((jobs || []).map((job) => job.user_id))]
  const { data: profiles } = userIds.length
    ? await supabaseAdmin.from('profiles').select('id, email, full_name').in('id', userIds)
    : { data: [] }

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))
  const enriched = (jobs || []).map((job) => ({
    ...job,
    profile: profileById.get(job.user_id) || null,
  }))

  return NextResponse.json({ jobs: enriched })
}
