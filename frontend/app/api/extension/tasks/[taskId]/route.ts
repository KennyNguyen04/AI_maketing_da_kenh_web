import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../../_auth'

/**
 * PATCH/DELETE /api/extension/tasks/[taskId]
 *
 * Uses service-role client (RLS bypass) — auth is enforced by verifyToken.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { status, error_message, platform, post_url } = await request.json()

    // Allowed: pending/processing/completed/failed. 'cancelled' has its own endpoint
    // (POST /api/extension/cancel) so users can supply a reason and audit trail.
    const ALLOWED_STATUSES = ['completed', 'failed', 'pending', 'processing'] as const
    if (!status || !(ALLOWED_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { status }
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
      // Do NOT overwrite channel/target_id here — those were assigned by the
      // schedule route and may not match the platform's actual post URL.
      // post_url is logged for debugging only; the audit trail lives in publish_attempts.
      if (post_url) console.log(`[task ${taskId}] published at ${post_url}`)
    }
    if (error_message) updates.error_message = error_message

    const { error, data: updatedRows } = await supabaseAdmin.from('extension_tasks').update(updates).eq('id', taskId).eq('user_id', userId).select('id')
    if (error) {
      console.error(`PATCH /api/extension/tasks/${taskId} error:`, error)
      return NextResponse.json({ error: 'Update failed', detail: error.message }, { status: 500 })
    }
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/extension/tasks/[taskId] unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const { error, data: deletedRows } = await supabaseAdmin.from('extension_tasks').delete().eq('id', taskId).eq('user_id', userId).select('id')
    if (error) {
      console.error(`DELETE /api/extension/tasks/${taskId} error:`, error)
      return NextResponse.json({ error: 'Delete failed', detail: error.message }, { status: 500 })
    }
    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/extension/tasks/[taskId] unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
