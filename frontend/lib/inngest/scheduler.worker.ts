/**
 * Inngest Worker — Scheduled Posts Processor
 * Handles: Auto-publish scheduled drafts when their time comes
 * Runs every 5 minutes via cron trigger
 */

import { inngest } from './client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getValidAccessToken } from '@/lib/social/token-manager'
import { PROVIDER_CONFIGS } from '@/lib/social/rate-limiter'

type PublishResult = { success: boolean; error?: string; externalPostId?: string; externalPostUrl?: string }

function mapChannelToProvider(channel: string): 'x' | 'facebook' | null {
  switch (channel) {
    case 'twitter': return 'x'
    case 'facebook': return 'facebook'
    default: return null
  }
}

async function checkRateLimit(userId: string, provider: string): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
  const config = PROVIDER_CONFIGS[provider]
  if (!config) return { allowed: true }

  const now = new Date()
  const windowStart = new Date(now.getTime() - config.windowMinutes * 60 * 1000)

  const { count } = await supabaseAdmin
    .from('publish_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('status', 'published')
    .gte('created_at', windowStart.toISOString())

  if (count !== null && count >= config.limit) {
    const { data: oldest } = await supabaseAdmin
      .from('publish_attempts')
      .select('created_at')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('status', 'published')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (oldest) {
      const resetAt = new Date(new Date(oldest.created_at).getTime() + config.windowMinutes * 60 * 1000)
      const retryAfterMs = resetAt.getTime() - now.getTime()
      return { allowed: false, reason: `Rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 60000)} minutes.`, retryAfter: Math.ceil(retryAfterMs / 60000) }
    }
    return { allowed: false, reason: 'Rate limit exceeded.', retryAfter: config.windowMinutes }
  }

  const { data: lastPost } = await supabaseAdmin
    .from('publish_attempts')
    .select('created_at')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (lastPost) {
    const timeSince = now.getTime() - new Date(lastPost.created_at).getTime()
    const minDelayMs = config.minDelayMinutes * 60 * 1000
    if (timeSince < minDelayMs) {
      return { allowed: false, reason: `Please wait ${Math.ceil((minDelayMs - timeSince) / 60000)} more minutes.`, retryAfter: Math.ceil((minDelayMs - timeSince) / 60000) }
    }
  }

  return { allowed: true }
}

async function publishDraft(draft: { id: string; user_id: string; channel: string; content: string }): Promise<PublishResult> {
  const provider = mapChannelToProvider(draft.channel)
  if (!provider) return { success: false, error: `Channel ${draft.channel} is not supported for auto-publishing` }

  try {
    const { data: account, error: accountError } = await supabaseAdmin
      .from('social_targets')
      .select('*')
      .eq('user_id', draft.user_id)
      .eq('provider', provider)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (accountError || !account) return { success: false, error: `${provider} account is not connected` }

    const { accessToken } = await getValidAccessToken(account)

    const rateCheck = await checkRateLimit(draft.user_id, provider)
    if (!rateCheck.allowed) return { success: false, error: rateCheck.reason }

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('publish_attempts')
      .insert({ draft_id: draft.id, user_id: draft.user_id, provider, target_id: account.external_account_id, target_name: account.display_name, status: 'publishing' })
      .select('id')
      .single()

    if (attemptError || !attempt) return { success: false, error: 'Failed to create publish attempt' }

    if (provider === 'x') {
      const response = await fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft.content }),
      })

      const result = await response.json().catch(() => ({})) as { data?: { id?: string }; detail?: string; title?: string }

      if (!response.ok || !result.data?.id) {
        const errorMessage = result.detail || result.title || 'X publish failed'
        await supabaseAdmin.from('publish_attempts').update({ status: 'failed', error_message: errorMessage }).eq('id', attempt.id)
        await supabaseAdmin.from('drafts').update({ publish_status: 'failed' }).eq('id', draft.id)
        return { success: false, error: errorMessage }
      }

      const externalUrl = `https://x.com/i/web/status/${result.data.id}`
      await supabaseAdmin.from('publish_attempts').update({ status: 'published', external_post_id: result.data.id, external_post_url: externalUrl }).eq('id', attempt.id)
      return { success: true, externalPostId: result.data.id, externalPostUrl: externalUrl }
    }

    // Facebook publish
    const facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${account.external_account_id}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message: draft.content, access_token: accessToken }),
    })

    const facebookResult = await facebookResponse.json().catch(() => ({})) as { id?: string; error?: { message?: string } }

    if (!facebookResponse.ok || !facebookResult.id) {
      const errorMessage = facebookResult.error?.message || 'Facebook publish failed'
      await supabaseAdmin.from('publish_attempts').update({ status: 'failed', error_message: errorMessage }).eq('id', attempt.id)
      await supabaseAdmin.from('drafts').update({ publish_status: 'failed' }).eq('id', draft.id)
      return { success: false, error: errorMessage }
    }

    const fbExternalUrl = `https://www.facebook.com/${facebookResult.id}`
    await supabaseAdmin.from('publish_attempts').update({ status: 'published', external_post_id: facebookResult.id, external_post_url: fbExternalUrl }).eq('id', attempt.id)
    return { success: true, externalPostId: facebookResult.id, externalPostUrl: fbExternalUrl }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during publish'
    await supabaseAdmin.from('drafts').update({ publish_status: 'failed' }).eq('id', draft.id)
    return { success: false, error: errorMessage }
  }
}

// ─── Cron: Process Scheduled Drafts ───
export const processScheduledPosts = inngest.createFunction(
  { id: 'process-scheduled-posts', retries: 2 },
  { cron: '*/5 * * * *' },
  async ({ step }) => {
    const draftsToPublish = await step.run('claim-ready-drafts', async () => {
      const nowIso = new Date().toISOString()
      const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString()

      // Step A: Release stale claims (workers that crashed mid-process).
      // A "stale claim" is a draft that was claimed (processing_started_at set)
      // but never advanced to 'publishing' within 10 minutes. This means the
      // worker crashed or hung between claim and publish. We release it back to
      // 'scheduled' so the next cron run can pick it up.
      // NOTE: We do NOT mark these as 'failed' here — the publish itself may have
      // succeeded and just status update was lost. Marking as 'failed' would lose
      // the publish. The retry mechanism handles true failures elsewhere.
      await supabaseAdmin
        .from('drafts')
        .update({ processing_started_at: null })
        .eq('publish_status', 'scheduled')
        .not('processing_started_at', 'is', null)
        .lt('processing_started_at', staleThreshold)

      // Step B: Atomic claim — update scheduled → processing for up to 50 ready rows,
      // then return the rows we just claimed. Single UPDATE+RETURNING in one query
      // prevents 2 cron instances from picking up the same drafts.
      const { data, error } = await supabaseAdmin
        .from('drafts')
        .update({ processing_started_at: nowIso })
        .eq('publish_status', 'scheduled')
        .lte('scheduled_for', nowIso)
        .is('processing_started_at', null)
        .select('id, user_id, channel, content')
        .limit(50)

      if (error) throw new Error(`Failed to claim drafts: ${error.message}`)
      return data || []
    })

    if (draftsToPublish.length === 0) {
      return { message: 'No drafts to process', processed: 0 }
    }

    const results = await step.run('publish-drafts', async () => {
      const publishResults: Array<{ draftId: string; success: boolean; error?: string }> = []
      for (const draft of draftsToPublish) {
        const result = await publishDraft(draft)
        if (result.success) {
          await supabaseAdmin.from('drafts').update({ publish_status: 'published' }).eq('id', draft.id)
        }
        publishResults.push({ draftId: draft.id, success: result.success, error: result.error })
      }
      return publishResults
    })

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return {
      message: `Processed ${draftsToPublish.length} scheduled posts`,
      processed: draftsToPublish.length,
      successful,
      failed,
      details: results.filter((r: { success: boolean }) => !r.success)
    }
  }
)

// ─── Event: Manually trigger scheduler (for testing) ───
export const triggerScheduler = inngest.createFunction(
  { id: 'trigger-scheduler-manual' },
  { event: 'scheduler/trigger' },
  async ({ event, step }) => {
    return await step.run('run-scheduler', async () => {
      const { data } = await supabaseAdmin
        .from('drafts')
        .select('id, user_id, channel, content, scheduled_for')
        .eq('publish_status', 'scheduled')
        .lte('scheduled_for', new Date().toISOString())
        .limit(50)

      if (!data || data.length === 0) {
        return { message: 'No drafts to process', processed: 0 }
      }

      const results = []
      for (const draft of data) {
        const result = await publishDraft(draft)
        if (result.success) {
          await supabaseAdmin.from('drafts').update({ publish_status: 'published' }).eq('id', draft.id)
        }
        results.push({ draftId: draft.id, ...result })
      }

      return { message: `Processed ${data.length} posts`, processed: data.length, results }
    })
  }
)
