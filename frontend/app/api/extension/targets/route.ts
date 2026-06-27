import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../_auth'

export async function GET(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { data: targets } = await supabaseAdmin.from('social_targets').select('*').eq('user_id', userId).eq('is_active', true)

    return NextResponse.json({ targets: targets || [] })
  } catch (error) {
    console.error('GET /api/extension/targets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
