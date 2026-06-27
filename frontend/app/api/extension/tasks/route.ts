import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../_auth'

/**
 * GET /api/extension/tasks
 * Returns pending tasks ready for extension to process.
 *
 * NOTE: Uses service-role client because Bearer-token extension requests
 * have no Supabase session, so RLS on extension_tasks would always return 0.
 * Auth is handled by verifyToken() which checks the api_keys table.
 */
export async function GET(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data: tasks } = await supabaseAdmin
      .from('extension_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(limit)

    return NextResponse.json({ tasks: tasks || [] })
  } catch (error) {
    console.error('GET /api/extension/tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { content, target_url, platforms, scheduled_for } = await request.json()

    if (!content || !platforms?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: task, error } = await supabaseAdmin.from('extension_tasks').insert({
      user_id: userId, content, target_url, channel: platforms[0],
      scheduled_for: scheduled_for || new Date().toISOString(), status: 'pending'
    }).select().single()

    if (error) {
      console.error('Create task error:', error)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('POST /api/extension/tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
