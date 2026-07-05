import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertUuid, validationErrorResponse } from '@/lib/validation/api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await params
    const id = assertUuid(rawId, 'job_id')

    const { data: job, error: jobError } = await supabase
      .from('repurpose_jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    let drafts: Record<string, unknown>[] = []
    if (job.status === 'done' || job.status === 'processing') {
      const { data: fetchedDrafts } = await supabase
        .from('drafts')
        .select('id, channel, content, is_done, version')
        .eq('job_id', id)
        .eq('user_id', user.id)
        .eq('is_current', true)
        .eq('is_deleted', false)

      drafts = fetchedDrafts || []
    }

    return NextResponse.json({ job, drafts })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    console.error('GET /api/jobs/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/jobs/[id]
 * Soft delete a job and cascade-hide its drafts. DB rows are kept for audit.
 *
 * Block list:
 *   - Any draft in this job has a pending or processing extension_task
 *     (user must cancel the scheduled post first).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await params
    const id = assertUuid(rawId, 'job_id')

    const { data: job } = await supabase
      .from('repurpose_jobs')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const { data: draftRows } = await supabase
      .from('drafts')
      .select('id')
      .eq('job_id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)

    const draftIds = (draftRows || []).map((d: { id: string }) => d.id)

    if (draftIds.length > 0) {
      const { count } = await supabase
        .from('extension_tasks')
        .select('id', { count: 'exact', head: true })
        .in('draft_id', draftIds)
        .in('status', ['pending', 'processing'])

      if ((count || 0) > 0) {
        return NextResponse.json(
          { error: 'Job đang có bản nháp chờ Extension đăng. Hãy huỷ lịch trước khi xoá job.' },
          { status: 409 },
        )
      }
    }

    const now = new Date().toISOString()

    const { error: jobErr } = await supabase
      .from('repurpose_jobs')
      .update({ is_deleted: true, updated_at: now } as never)
      .eq('id', id)
      .eq('user_id', user.id)

    if (jobErr) {
      console.error('Failed to soft-delete job:', jobErr)
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
    }

    if (draftIds.length > 0) {
      await supabase
        .from('drafts')
        .update({ is_deleted: true, updated_at: now })
        .eq('job_id', id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ ok: true, hiddenDraftsCount: draftIds.length })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    console.error('DELETE /api/jobs/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
