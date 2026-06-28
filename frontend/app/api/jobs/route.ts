import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { createRequestLogger } from '@/lib/observability/logger'
import {
  assertUuid,
  validateChannels,
  validateSourceContent,
  validateSourceType,
  validateTitle,
  validationErrorResponse,
} from '@/lib/validation/api'

export async function POST(request: Request) {
  const log = createRequestLogger('/api/jobs', 'POST')
  try {
    const idempotencyKey = request.headers.get('Idempotency-Key')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Idempotency: if same key was used within 5 minutes, return the existing job
    if (idempotencyKey) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: existing } = await supabase
        .from('repurpose_jobs')
        .select('id, created_at')
        .eq('user_id', user.id)
        .eq('idempotency_key', idempotencyKey)
        .gte('created_at', fiveMinutesAgo)
        .single()

      if (existing) {
        log.done(200, { userId: user.id, jobId: existing.id, source: 'idempotent' })
        return NextResponse.json({ jobId: existing.id, status: 'pending', idempotent: true })
      }
    }

    const body = await request.json()
    const sourceType = validateSourceType(body.source_type)
    const sourceContent = validateSourceContent(body.source_content, sourceType)
    const channels = validateChannels(body.channels)
    const brandVaultId = assertUuid(body.brand_vault_id, 'brand_vault_id')
    const title = validateTitle(body.title)

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_plan')
      .eq('id', user.id)
      .single()

    if (profile?.user_plan === 'free') {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count, error: countError } = await supabase
        .from('repurpose_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', yesterday)

      if (countError) {
        log.error('jobs.rate_limit_count_failed', countError, { userId: user.id })
        return NextResponse.json({ error: 'Could not verify daily limit' }, { status: 500 })
      }

      if ((count || 0) >= 20) {
        log.done(429, { userId: user.id })
        return NextResponse.json({ error: 'Daily limit reached for free plan' }, { status: 429 })
      }
    }

    const { data: vault } = await supabase
      .from('brand_vaults')
      .select('id')
      .eq('id', brandVaultId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!vault) {
      log.done(404, { userId: user.id, brandVaultId })
      return NextResponse.json({ error: 'Brand Vault not found' }, { status: 404 })
    }

    // Insert pending job
    const { data: job, error: insertError } = await supabase
      .from('repurpose_jobs')
      .insert({
        user_id: user.id,
        brand_vault_id: brandVaultId,
        title,
        source_type: sourceType,
        source_content: sourceContent,
        channels,
        status: 'pending',
        ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to create job:', insertError)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    // Trigger Inngest
    await inngest.send({
      name: 'repurpose/start',
      data: {
        jobId: job.id,
        userId: user.id,
        brandVaultId,
        sourceContent,
        sourceType,
        channels,
      }
    })

    log.done(200, { userId: user.id, jobId: job.id, channels })
    return NextResponse.json({ jobId: job.id, status: 'pending' })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    console.error('POST /api/jobs error:', error)
    log.error('jobs.create_failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  const log = createRequestLogger('/api/jobs', 'GET')
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: jobs, error } = await supabase
      .from('repurpose_jobs')
      .select('id, title, status, created_at, channels, source_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch jobs:', error)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    log.done(200, { userId: user.id, count: jobs?.length || 0 })
    return NextResponse.json({ jobs })
  } catch (error) {
    console.error('GET /api/jobs error:', error)
    log.error('jobs.list_failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
