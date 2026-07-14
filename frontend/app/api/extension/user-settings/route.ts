import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const DEFAULT_RATE_LIMITS = {
  facebook: { perDay: 5, perHour: 2, minIntervalS: 1800, enabled: true },
  'facebook-group': { perDay: 3, perHour: 1, minIntervalS: 3600, enabled: true },
  threads: { perDay: 10, perHour: 4, minIntervalS: 900, enabled: true },
  instagram: { perDay: 5, perHour: 2, minIntervalS: 1800, enabled: true },
  x: { perDay: 15, perHour: 5, minIntervalS: 720, enabled: true },
}

/**
 * GET /api/extension/user-settings — return user's extension configuration.
 * Auth: cookie-based session (for frontend UI).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('extension_user_settings')
      .select('rate_limits, auto_preview, preview_delay_seconds')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('GET /api/extension/user-settings error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rateLimits =
      data?.rate_limits && Object.keys(data.rate_limits).length > 0
        ? data.rate_limits
        : DEFAULT_RATE_LIMITS

    return NextResponse.json({
      rate_limits: rateLimits,
      auto_preview: data?.auto_preview ?? false,
      preview_delay_seconds: data?.preview_delay_seconds ?? 10,
    })
  } catch (error) {
    console.error('GET /api/extension/user-settings unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/extension/user-settings
 * Body (all optional): { rate_limits?, auto_preview?, preview_delay_seconds? }
 * Auth: cookie-based session (for frontend UI).
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }
    if (body.rate_limits !== undefined) updates.rate_limits = body.rate_limits
    if (body.auto_preview !== undefined) updates.auto_preview = body.auto_preview
    if (body.preview_delay_seconds !== undefined) {
      const n = Number(body.preview_delay_seconds)
      if (!Number.isFinite(n) || n < 0 || n > 300) {
        return NextResponse.json({ error: 'preview_delay_seconds must be 0..300' }, { status: 400 })
      }
      updates.preview_delay_seconds = Math.floor(n)
    }

    const { error } = await supabaseAdmin
      .from('extension_user_settings')
      .upsert(updates, { onConflict: 'user_id' })

    if (error) {
      console.error('PATCH /api/extension/user-settings error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/extension/user-settings unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
