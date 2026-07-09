import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../_auth'
import { encryptToken } from '@/lib/social/crypto'

export async function GET(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // Exclude token columns — extension never needs them and they should never leave the server.
    const { data: accounts } = await supabaseAdmin
      .from('social_targets')
      .select('id, provider, display_name, config')
      .eq('user_id', userId)

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
    if (access_token) updates.access_token_encrypted = encryptToken(access_token)
    if (access_token_secret) updates.access_token_secret = encryptToken(access_token_secret)

    const { error } = await supabaseAdmin.from('social_targets').update(updates).eq('id', account_id).eq('user_id', userId)
    if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PUT /api/extension/credentials error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}