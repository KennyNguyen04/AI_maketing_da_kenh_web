import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../_auth'

/**
 * POST /api/extension/resync
 *
 * Recovery endpoint for the Chrome extension when its service worker restarts
 * mid-task (browser update, MV3 eviction, machine sleep, …). Without this, a
 * task left at status='processing' by a dead worker would sit in the queue
 * forever — the next poll cycle sees 'processing' rows as already claimed and
 * silently skips them, so the user would just notice "bài bị kẹt".
 *
 * Behaviour:
 *   1. Find any rows where status='processing' AND updated_at is older than
 *      STALE_THRESHOLD_MINUTES. These are abandoned tasks whose worker died.
 *      Reset them to 'pending' with an audit-trail message.
 *   2. Return the next ready pending task (same filter as GET /api/extension/tasks
 *      but WITHOUT rate-limit filtering — the SW will re-fetch with limits after
 *      this recovery call). Returning a task here means the SW doesn't need a
 *      second round-trip to pick up the just-reset work.
 *
 * Uses service-role client (RLS bypass) — Bearer-token extension requests have
 * no Supabase session. Auth is enforced by verifyToken(); the .eq('user_id')
 * filter prevents one user's token from resyncing another's tasks.
 *
 * Mirrors MUT's /scheduled-posts/resync semantics but lives under
 * /api/extension/* to keep namespace consistent with the rest of the
 * extension-facing endpoints.
 */
const STALE_THRESHOLD_MINUTES = 5

export async function POST(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString()

    // 1. Reset stale processing tasks back to pending.
    //    We don't filter on scheduled_for here — if the user scheduled a post
    //    for 2 minutes from now and the worker died before processing it, we
    //    still want to recover it (the SW will respect scheduled_for on next poll).
    const { data: resetRows } = await supabaseAdmin
      .from('extension_tasks')
      .update({
        status: 'pending',
        error_message: `Auto-reset from resync (was stale processing > ${STALE_THRESHOLD_MINUTES} min)`,
      })
      .eq('user_id', userId)
      .eq('status', 'processing')
      .lt('updated_at', staleThreshold)
      .select('id')

    const resetCount = resetRows?.length || 0

    // 2. Return the next single pending task ready to run (scheduled_for <= now).
    //    Intentionally no rate-limit filter — the SW will re-poll and apply
    //    limits; if we filtered here the resync + immediate pick-up would race
    //    with the SW's normal poll. Returning the task is just a convenience
    //    so the SW knows it has something to do.
    const { data: candidates } = await supabaseAdmin
      .from('extension_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(1)

    return NextResponse.json({
      ok: true,
      reset_count: resetCount,
      tasks: candidates || [],
    })
  } catch (error) {
    console.error('POST /api/extension/resync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}