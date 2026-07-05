import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../_auth'

/**
 * POST /api/extension/cancel
 * Body: { task_id, reason? }
 *
 * Marks a single pending/processing extension_tasks row as 'cancelled'.
 * The reason (if provided) is stored in error_message so the user can
 * see why an inline cancellation happened (preview cancelled, paused, etc).
 *
 * Uses service-role client because Bearer-token extension requests have
 * no Supabase session — RLS would always return 0 rows. Auth is handled
 * by verifyToken() against api_keys; we additionally filter on user_id
 * to ensure a token cannot cancel other users' tasks.
 */
export async function POST(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { task_id, reason } = await request.json()
    if (!task_id) {
      return NextResponse.json({ error: 'Missing task_id' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('extension_tasks')
      .update({
        status: 'cancelled',
        error_message: reason || 'Cancelled by user',
      })
      .eq('id', task_id)
      .eq('user_id', userId)
      .in('status', ['pending', 'processing'])
      .select('id')

    if (error) {
      console.error('POST /api/extension/cancel error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Task not found or already finalized' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, task_id: data[0].id })
  } catch (error) {
    console.error('POST /api/extension/cancel unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
