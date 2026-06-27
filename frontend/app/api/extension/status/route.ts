import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findKeyByToken, getTokenRecord } from '../_auth'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const tokenData = await getTokenRecord(authHeader)
    if (!tokenData) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const supabase = await createClient()

    // Update last_used_at using verified token row (not recomputed hash)
    const matchedKey = await findKeyByToken(authHeader?.slice(7) || '')
    if (matchedKey?.user_id) {
      await supabase.from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', matchedKey.user_id)
        .eq('name', matchedKey.name || 'Chrome Extension')
    }

    const { count: pendingCount } = await supabase.from('extension_tasks').select('*', { count: 'exact', head: true }).eq('user_id', tokenData.user_id).eq('status', 'pending').lte('scheduled_for', new Date().toISOString())

    const today = new Date().toISOString().split('T')[0]
    const { count: completedToday } = await supabase.from('extension_tasks').select('*', { count: 'exact', head: true }).eq('user_id', tokenData.user_id).eq('status', 'completed').gte('completed_at', today)

    const { count: completedTotal } = await supabase.from('extension_tasks').select('*', { count: 'exact', head: true }).eq('user_id', tokenData.user_id).eq('status', 'completed')

    return NextResponse.json({
      ok: true, user_id: tokenData.user_id, token_name: tokenData.name,
      pending_tasks: pendingCount || 0, completed_today: completedToday || 0,
      completed_total: completedTotal || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('GET /api/extension/status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
