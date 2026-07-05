import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../_auth'

const DEFAULT_RATE_LIMITS = {
  facebook: { perDay: 5, perHour: 2, minIntervalS: 1800, enabled: true },
  'facebook-group': { perDay: 3, perHour: 1, minIntervalS: 3600, enabled: true },
  threads: { perDay: 10, perHour: 4, minIntervalS: 900, enabled: true },
  instagram: { perDay: 5, perHour: 2, minIntervalS: 1800, enabled: true },
  x: { perDay: 15, perHour: 5, minIntervalS: 720, enabled: true },
}

/**
 * GET /api/extension/settings — return user's extension configuration.
 * Uses service-role client because the request is bearer-token-only (no cookies,
 * so RLS would always yield zero rows).
 */
export async function GET(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('extension_user_settings')
      .select('rate_limits, auto_preview, preview_delay_seconds')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('GET /api/extension/settings error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If the row hasn't been created yet (trigger race or migration just ran),
    // fall back to defaults instead of 500ing. The PATCH flow will create the row.
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
    console.error('GET /api/extension/settings unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/extension/settings
 * Body (all optional): { rate_limits?, auto_preview?, preview_delay_seconds? }
 *
 * Uses upsert so the very first request also creates the row if missing.
 */
export async function PATCH(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const body = await request.json()
    const updates: Record<string, unknown> = {
      user_id: userId,
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
      console.error('PATCH /api/extension/settings error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/extension/settings unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
