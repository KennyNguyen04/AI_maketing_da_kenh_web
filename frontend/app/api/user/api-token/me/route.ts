import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { decryptToken } from '@/lib/crypto/token-cipher'

/**
 * GET /api/user/api-token/me
 * Return the user's current API token in plaintext (decrypted).
 * Used by the settings page so user can "show again" the token
 * after page refresh. Auth: cookie-based session only.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: keyData, error } = await supabaseAdmin
      .from('api_keys')
      .select('encrypted_token, created_at, last_used_at, key_prefix')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Failed to load api_key:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!keyData?.encrypted_token) {
      return NextResponse.json({ token: null })
    }

    let plaintext: string
    try {
      plaintext = decryptToken(keyData.encrypted_token)
    } catch (e) {
      console.error('Decryption failed (key rotated?):', e)
      return NextResponse.json(
        { error: 'Cannot decrypt stored token. Please regenerate.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      token: plaintext,
      key_prefix: keyData.key_prefix,
      created_at: keyData.created_at,
      last_used_at: keyData.last_used_at
    })
  } catch (error) {
    console.error('GET /api/user/api-token/me error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}