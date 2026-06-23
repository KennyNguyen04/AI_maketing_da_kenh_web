import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, user_plan, created_at')
    .order('created_at', { ascending: false })

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  const { data: jobs } = await supabaseAdmin
    .from('repurpose_jobs')
    .select('user_id, status')

  const stats = new Map<string, { total_jobs: number; failed_jobs: number }>()
  ;(jobs || []).forEach((job) => {
    const current = stats.get(job.user_id) || { total_jobs: 0, failed_jobs: 0 }
    current.total_jobs += 1
    if (job.status === 'failed') current.failed_jobs += 1
    stats.set(job.user_id, current)
  })

  const users = (profiles || []).map((profile) => ({
    ...profile,
    total_jobs: stats.get(profile.id)?.total_jobs || 0,
    failed_jobs: stats.get(profile.id)?.failed_jobs || 0,
  }))

  return NextResponse.json({ users })
}
