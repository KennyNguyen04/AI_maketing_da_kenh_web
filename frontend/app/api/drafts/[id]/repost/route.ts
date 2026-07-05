import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/drafts/[id]/repost
 *
 * Re-post an existing published/failed draft via the Extension by inserting
 * one new pending extension_tasks row. Mirrors /api/extension/repost but
 * uses cookie auth so the webapp PublishHistory page can call it directly.
 *
 * Channel is locked to the draft's original channel — multi-channel re-post
 * is intentionally out of scope for MVP (user can Copy + Open to other
 * channels manually, or use NewJobForm to generate fresh content).
 *
 * scheduled_for defaults to now + 60s so the Extension picks it up immediately
 * while still passing the /api/schedule "must be in the future" check pattern.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: draftId } = await params

    const { data: draft, error: draftErr } = await supabase
      .from('drafts')
      .select('id, content, channel, publish_status')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single()

    if (draftErr || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Only allow re-post from terminal-ish states. 'draft' and 'scheduled'
    // already have their own flows; 'published' is the canonical re-post case.
    if (!['published', 'failed'].includes(draft.publish_status)) {
      return NextResponse.json(
        { error: `Cannot re-post a draft with status "${draft.publish_status}"` },
        { status: 400 },
      )
    }

    const validChannels = ['facebook', 'facebook-group', 'x', 'threads', 'instagram']
    if (!validChannels.includes(draft.channel)) {
      return NextResponse.json(
        { error: `Channel "${draft.channel}" does not support re-post via Extension` },
        { status: 400 },
      )
    }

    const scheduledFor = new Date(Date.now() + 60_000).toISOString()

    const { data: task, error: insertErr } = await supabase
      .from('extension_tasks')
      .insert({
        user_id: user.id,
        draft_id: draft.id,
        channel: draft.channel,
        content: draft.content,
        images: [],
        target_id: null,
        target_type: 'auto',
        scheduled_for: scheduledFor,
        status: 'pending',
        priority: 0,
      })
      .select('id, channel, scheduled_for')
      .single()

    if (insertErr) {
      console.error('POST /api/drafts/[id]/repost error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, task })
  } catch (error) {
    console.error('POST /api/drafts/[id]/repost unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}