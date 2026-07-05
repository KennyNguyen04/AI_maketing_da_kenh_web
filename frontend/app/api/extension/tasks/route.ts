import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../_auth'

const DEFAULT_RATE_LIMITS = {
  facebook: { perDay: 5, perHour: 2, minIntervalS: 1800, enabled: true },
  'facebook-group': { perDay: 3, perHour: 1, minIntervalS: 3600, enabled: true },
  threads: { perDay: 10, perHour: 4, minIntervalS: 900, enabled: true },
  instagram: { perDay: 5, perHour: 2, minIntervalS: 1800, enabled: true },
  x: { perDay: 15, perHour: 5, minIntervalS: 720, enabled: true },
}

/**
 * GET /api/extension/tasks
 * Returns the next single pending task ready for the extension to process,
 * after applying the user's per-channel rate limits.
 *
 * Rate limit filter (per user, per channel):
 *   - enabled: false → task kept (user explicitly disabled limiting)
 *   - perDay: today's completed count >= perDay → skip
 *   - minIntervalS: since last completed in this channel < minIntervalS → skip
 *
 * Returns ONE task at a time (`limit=1`) — the extension polls per task so we
 * avoid a race where 19 tasks get loaded but only one is consumed.
 */
export async function GET(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // Fetch up to a small candidate set, then apply rate-limit filter.
    // limit=10 lets the extension skip past blocked channels instead of starving.
    const { data: candidates } = await supabaseAdmin
      .from('extension_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(10)

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ tasks: [] })
    }

    // Load user rate-limit settings.
    const { data: settings } = await supabaseAdmin
      .from('extension_user_settings')
      .select('rate_limits')
      .eq('user_id', userId)
      .single()

    const limits =
      settings?.rate_limits && Object.keys(settings.rate_limits).length > 0
        ? settings.rate_limits
        : DEFAULT_RATE_LIMITS

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    for (const task of candidates) {
      const channelLimit = (limits as Record<string, any>)?.[task.channel]
      if (!channelLimit || channelLimit.enabled === false) {
        // No limit configured or user disabled this channel → return as-is.
        return NextResponse.json({ tasks: [task] })
      }

      // Count today's completed tasks on this channel.
      const { count: dayCount } = await supabaseAdmin
        .from('extension_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('channel', task.channel)
        .eq('status', 'completed')
        .gte('completed_at', startOfToday.toISOString())

      if (typeof channelLimit.perDay === 'number' && (dayCount || 0) >= channelLimit.perDay) {
        console.log(`[Rate limit] ${task.channel}: ${dayCount}/${channelLimit.perDay} — skip`)
        continue
      }

      // Check min interval since last completed on this channel.
      const { data: lastTask } = await supabaseAdmin
        .from('extension_tasks')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('channel', task.channel)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastTask?.completed_at && typeof channelLimit.minIntervalS === 'number') {
        const elapsedS = (Date.now() - new Date(lastTask.completed_at).getTime()) / 1000
        if (elapsedS < channelLimit.minIntervalS) {
          console.log(
            `[Rate limit] ${task.channel}: min interval not met (${Math.floor(elapsedS)}s/${channelLimit.minIntervalS}s)`
          )
          continue
        }
      }

      return NextResponse.json({ tasks: [task] })
    }

    return NextResponse.json({ tasks: [] })
  } catch (error) {
    console.error('GET /api/extension/tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

