import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'

const ALLOWED_STATUSES = new Set(['all', 'pending', 'processing', 'done', 'failed'])

export async function GET(request: Request) {
  const { error: adminError } = await requireAdmin()
  if (adminError) return adminError

  // Use supabaseAdmin (service role, bypasses RLS) so admin sees jobs
  // across ALL users. createClient() would apply RLS USING (auth.uid() = user_id)
  // and silently filter out every other user's jobs.
  const supabase = supabaseAdmin
  const { searchParams } = new URL(request.url)
  const rawStatus = searchParams.get('status') || 'all'
  const status = ALLOWED_STATUSES.has(rawStatus) ? rawStatus : 'all'

  // Explicit column list — DO NOT use select('*') here.
  // source_content and error_message can leak private user input (drafts,
  // personal notes, API error strings). Only the columns AdminPanel renders
  // are needed.
  let query = supabase
    .from('repurpose_jobs')
    .select(
      'id, user_id, title, source_type, channels, status, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Hydrate user emails so the admin table can show who owns each job.
  const userIds = [...new Set((data || []).map((j) => j.user_id).filter(Boolean))]
  let profileById = new Map<string, { id: string; email: string | null; full_name: string | null }>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)
    profileById = new Map((profiles || []).map((p) => [p.id, p]))
  }

  const jobs = (data || []).map((job) => ({
    ...job,
    user_email: profileById.get(job.user_id)?.email ?? null,
    user_name: profileById.get(job.user_id)?.full_name ?? null,
  }))

  return NextResponse.json({
    jobs,
    total: count || 0,
    filter: status,
  })
}