import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../_auth'

/**
 * GET /api/extension/recent-drafts?limit=20
 * Returns the user's most recently published drafts for the "re-post" UI.
 *
 * Schema-aware:
 *   - lifecycle column is `publish_status` (not `status`): 'draft'|'scheduled'|'published'|'failed'.
 *   - drafts.images / target_id / target_type / published_at do NOT exist on the base
 *     schema; we only select columns known to exist and return safe defaults.
 *
 * POST /api/extension/repost
 * Body: { draft_id, scheduled_for?, channels: string[] }
 * Creates new extension_tasks rows from an existing published draft.
 * Note: re-post is text-only — images/target_id are not present on drafts.
 */
export async function GET(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const { data, error } = await supabaseAdmin
      .from('drafts')
      .select('id, content, updated_at')
      .eq('user_id', userId)
      .eq('publish_status', 'published')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('GET /api/extension/recent-drafts error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Always return `images: []` so the UI doesn't have to null-check.
    const drafts = (data || []).map(d => ({
      id: d.id,
      content: d.content,
      images: [] as string[],
      target_id: null as string | null,
      target_type: 'auto' as string,
      published_at: d.updated_at,
      has_images: false,
    }))

    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('GET /api/extension/recent-drafts unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { draft_id, scheduled_for, channels } = await request.json()
    if (!draft_id || !Array.isArray(channels) || channels.length === 0) {
      return NextResponse.json({ error: 'Missing draft_id or channels' }, { status: 400 })
    }

    const validChannels = ['facebook', 'facebook-group', 'x', 'threads', 'instagram']
    const invalid = channels.filter((c: string) => !validChannels.includes(c))
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid channels: ${invalid.join(', ')}` }, { status: 400 })
    }

    const { data: draft, error: draftErr } = await supabaseAdmin
      .from('drafts')
      .select('id, content')
      .eq('id', draft_id)
      .eq('user_id', userId)
      .eq('publish_status', 'published')
      .single()

    if (draftErr || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const baseTime = scheduled_for ? new Date(scheduled_for) : new Date()
    if (isNaN(baseTime.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduled_for' }, { status: 400 })
    }

    // Note: as of 2026-07-04 schema dump, no CHECK constraints on extension_tasks.
    // Channel + status validation is enforced here (validChannels above) and at the UI layer.
    const rows = channels.map((channel: string, idx: number) => ({
      user_id: userId,
      draft_id: draft.id,
      channel,
      content: draft.content,
      images: [] as string[],
      target_id: null as string | null,
      target_type: 'auto',
      scheduled_for: new Date(baseTime.getTime() + idx * 60_000).toISOString(),
      status: 'pending',
      priority: 0,
    }))

    const { data: tasks, error } = await supabaseAdmin
      .from('extension_tasks')
      .insert(rows)
      .select('id, channel, scheduled_for')

    if (error) {
      console.error('POST /api/extension/repost error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('POST /api/extension/repost unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
