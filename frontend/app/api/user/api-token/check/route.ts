import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/user/api-token/check
 * Check if user has an API token
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ has_token: false })
    }

    // Check in api_keys table
    const { data: tokenData } = await supabase
      .from('api_keys')
      .select('id, name, last_used_at, created_at')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({
      has_token: !!tokenData,
      token_name: tokenData?.name || null,
      last_used_at: tokenData?.last_used_at || null,
      created_at: tokenData?.created_at || null
    })
  } catch (error) {
    console.error('GET /api/user/api-token/check error:', error)
    return NextResponse.json({ has_token: false })
  }
}
