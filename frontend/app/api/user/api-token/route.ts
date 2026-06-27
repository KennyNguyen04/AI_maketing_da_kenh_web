import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashToken, getKeyPrefix } from '../../extension/_auth'

/**
 * POST /api/user/api-token
 * Generate new API token
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate new token
    const newToken = `amp_${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`
    const tokenHash = hashToken(newToken)
    const keyPrefix = getKeyPrefix(newToken)

    // Save to api_keys table
    const { error } = await supabase.from('api_keys').insert({
      user_id: user.id,
      name: 'Chrome Extension',
      key_hash: tokenHash,
      key_prefix: keyPrefix
    })

    if (error) {
      console.error('Failed to save token:', error)
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
    }

    // Update user metadata
    await supabase.auth.updateUser({
      data: { has_api_token: true, api_token_created_at: new Date().toISOString() }
    })

    return NextResponse.json({ 
      token: newToken,
      message: 'Token generated successfully'
    })
  } catch (error) {
    console.error('POST /api/user/api-token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/user/api-token
 * Get current API token info (no secrets)
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tokens } = await supabase
      .from('api_keys')
      .select('id, name, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ tokens: tokens || [] })
  } catch (error) {
    console.error('GET /api/user/api-token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/user/api-token
 * Revoke all API tokens
 */
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await supabase.from('api_keys').delete().eq('user_id', user.id)

    await supabase.auth.updateUser({
      data: { has_api_token: false }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/user/api-token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
