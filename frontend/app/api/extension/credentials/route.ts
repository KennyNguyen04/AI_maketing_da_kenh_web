import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../_auth'

export async function GET(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data: accounts } = await supabaseAdmin
      .from('social_accounts')
      .select('id, platform, username, access_token, access_token_secret, config')
      .eq('user_id', userId)
      .eq('is_active', true)

    return NextResponse.json({ credentials: accounts || [] })
  } catch (error) {
    console.error('GET /api/extension/credentials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { account_id, access_token, access_token_secret } = await request.json()
    if (!account_id) return NextResponse.json({ error: 'Missing account_id' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (access_token) updates.access_token = access_token
    if (access_token_secret) updates.access_token_secret = access_token_secret

    const { error } = await supabaseAdmin.from('social_accounts').update(updates).eq('id', account_id).eq('user_id', userId)
    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PUT /api/extension/credentials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
