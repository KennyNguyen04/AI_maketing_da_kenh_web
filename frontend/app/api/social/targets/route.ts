import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Cookie-auth mirror of /api/extension/targets for the webapp.
 * SocialTargetsSettings component lives in the web context (cookie session),
 * so it cannot call /api/extension/* (bearer-auth only).
 *
 * GET: list user's social_targets where is_active = true
 * POST: create new target
 */

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: targets } = await supabase
      .from('social_targets')
      .select('id, channel, target_id, target_type, name, url, description, member_count, is_active, auto_post_enabled, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('is_active', true)

    return NextResponse.json({ targets: targets || [] })
  } catch (error) {
    console.error('GET /api/social/targets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { channel, targetId, targetType, name, url, autoPost } = body

    if (!channel || !targetId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: channel, targetId, name' },
        { status: 400 }
      )
    }

    const validChannels = ['facebook', 'facebook-group', 'x', 'threads', 'instagram', 'linkedin']
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
        { status: 400 }
      )
    }

    const validTargetTypes = ['group', 'page', 'profile']
    const resolvedTargetType = validTargetTypes.includes(targetType) ? targetType : 'group'

    const { data, error } = await supabaseAdmin
      .from('social_targets')
      .insert({
        user_id: user.id,
        channel,
        target_id: targetId,
        target_type: resolvedTargetType,
        name,
        url: url || null,
        is_active: true,
        auto_post_enabled: Boolean(autoPost),
      })
      .select()
      .single()

    if (error) {
      console.error('POST /api/social/targets insert error:', error)
      return NextResponse.json({ error: 'Failed to create target' }, { status: 500 })
    }

    return NextResponse.json({ target: data })
  } catch (error) {
    console.error('POST /api/social/targets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}