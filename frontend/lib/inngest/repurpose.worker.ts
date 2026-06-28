/**
 * Inngest Worker — Content Repurposing
 * Handles: generate drafts for multiple channels in parallel
 */

import { inngest } from './client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { extractTextFromUrl } from './helpers'

type DraftResult = { channel: string; content: string; error: string | null }

// ─── Event: Repurpose Content ───
export const repurposeContent = inngest.createFunction(
  { id: 'repurpose-content', retries: 3 },
  { event: 'repurpose/start' },
  async ({ event, step }) => {
    const { jobId, userId, brandVaultId, sourceContent, sourceType, channels } = event.data

    // Step 1: Update status to processing
    await step.run('update-job-processing', async () => {
      const { error } = await supabaseAdmin
        .from('repurpose_jobs')
        .update({ status: 'processing' })
        .eq('id', jobId)
      if (error) throw new Error(`Failed to update job status: ${error.message}`)
    })

    // Step 2: Extract text if URL
    let actualContent = sourceContent
    if (sourceType === 'url') {
      actualContent = await step.run('extract-url', async () => {
        try {
          const text = await extractTextFromUrl(sourceContent)
          return text.split(/\s+/).slice(0, 5000).join(' ')
        } catch (err: unknown) {
          throw new Error(`Failed to extract text from URL: ${err instanceof Error ? err.message : String(err)}`)
        }
      })
    }

    // Step 3: Fetch Brand Vault for system prompt
    const vault = await step.run('fetch-brand-vault', async () => {
      const { data, error } = await supabaseAdmin
        .from('brand_vaults')
        .select('system_prompt')
        .eq('id', brandVaultId)
        .single()
      if (error || !data) throw new Error('Failed to fetch brand vault')
      return data
    })

    // Step 4: Run AI generation for each channel in parallel
    const draftResults: DraftResult[] = await step.run('generate-drafts', async () => {
      const { repurposeContentAI } = await import('@/lib/ai')
      const results = await Promise.all(
        channels.map(async (channel: string) => {
          try {
            const content = await repurposeContentAI(vault.system_prompt, actualContent, channel)
            return { channel, content, error: null } satisfies DraftResult
          } catch (err: unknown) {
            return { channel, content: '', error: err instanceof Error ? err.message : String(err) } satisfies DraftResult
          }
        })
      )
      return results
    })

    // Step 5: Save drafts and update job status (idempotent + error-aware)
    await step.run('save-drafts-and-finish', async () => {
      const draftsToInsert = draftResults
        .filter((r: DraftResult) => !r.error)
        .map((r: DraftResult) => ({
          job_id: jobId,
          user_id: userId,
          channel: r.channel,
          content: r.content,
          is_current: true,
          version: 1,
        }))

      const allFailed = draftResults.length > 0 && draftResults.every((r: DraftResult) => r.error)
      const firstError = draftResults.find((r: DraftResult) => r.error)?.error || null

      if (draftsToInsert.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('drafts')
          .insert(draftsToInsert)
        if (insertError) {
          await supabaseAdmin
            .from('repurpose_jobs')
            .update({ status: 'failed', error_message: `Failed to insert drafts: ${insertError.message}` })
            .eq('id', jobId)
            .eq('status', 'processing')
          throw new Error(`Failed to insert drafts: ${insertError.message}`)
        }
      }

      // Always finalize: don't leave job stuck in 'processing'
      const finalStatus = allFailed ? 'failed' : 'done'
      const finalError = allFailed ? firstError : null
      const { error: updateError } = await supabaseAdmin
        .from('repurpose_jobs')
        .update({ status: finalStatus, error_message: finalError })
        .eq('id', jobId)
        .eq('status', 'processing') // only flip from processing — idempotent
      if (updateError) throw new Error(`Failed to finish job: ${updateError.message}`)
    })

    return { success: true, jobId }
  }
)