import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../_auth'

export async function GET(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data: targets } = await supabaseAdmin
      .from('social_targets')
      .select('id, channel, target_id, target_type, name, url, description, member_count, is_active, auto_post_enabled, schedule, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)

    return NextResponse.json({ targets: targets || [] })
  } catch (error) {
    console.error('GET /api/extension/targets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

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
        user_id: userId,
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
      console.error('POST /api/extension/targets insert error:', error)
      return NextResponse.json({ error: 'Failed to create target' }, { status: 500 })
    }

    return NextResponse.json({ target: data })
  } catch (error) {
    console.error('POST /api/extension/targets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
