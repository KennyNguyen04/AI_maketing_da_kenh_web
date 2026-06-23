import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { inngest } from '@/lib/inngest/client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { assertUuid, validationErrorResponse } from '@/lib/validation/api'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin()
    if (error) return error

    const { id: rawId } = await params
    const id = assertUuid(rawId, 'job_id')

    const { data: job, error: jobError } = await supabaseAdmin
      .from('repurpose_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'failed') {
      return NextResponse.json({ error: 'Only failed jobs can be retried' }, { status: 400 })
    }

    await supabaseAdmin
      .from('repurpose_jobs')
      .update({ status: 'pending', error_message: null })
      .eq('id', id)

    await inngest.send({
      name: 'repurpose/start',
      data: {
        jobId: job.id,
        userId: job.user_id,
        brandVaultId: job.brand_vault_id,
        sourceContent: job.source_content,
        sourceType: job.source_type,
        channels: job.channels,
      },
    })

    return NextResponse.json({ jobId: job.id, status: 'pending' })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Retry failed' }, { status: 500 })
  }
}
