import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: job, error: jobError } = await supabase
      .from('repurpose_jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Only fetch drafts if the job is done (or we can just fetch them regardless)
    let drafts: Record<string, unknown>[] = []
    if (job.status === 'done' || job.status === 'processing') {
      const { data: fetchedDrafts } = await supabase
        .from('drafts')
        .select('id, channel, content, is_done, version')
        .eq('job_id', id)
        .eq('is_current', true)
      
      drafts = fetchedDrafts || []
    }

    return NextResponse.json({ job, drafts })
  } catch (error) {
    console.error('GET /api/jobs/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
