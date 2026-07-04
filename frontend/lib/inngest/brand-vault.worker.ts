/**
 * Inngest Workers — Brand Vault Analysis
 * Handles: analyze text, analyze URL
 */

import { inngest } from './client'
import { analyzeVoice } from '@/lib/ai'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { extractTextFromUrl } from './helpers'
import { getCachedProfile, saveToCache } from '@/lib/voice-cache'

// ─── Event: Analyze Text ───
export const analyzeBrandVaultText = inngest.createFunction(
  { id: 'analyze-brand-vault-text', retries: 3 },
  { event: 'brand_vault/analyze.text' },
  async ({ event, step }) => {
    const { text, userId, vaultId, forceRefresh } = event.data

    // Step 1: Analyze text using Gemini (with cache layer + error reporting)
    const voiceProfile = await step.run('analyze-voice-with-ai', async () => {
      if (!forceRefresh) {
        const cached = await getCachedProfile(userId, text, 'text')
        if (cached) {
          console.log('[cache hit] text vault', vaultId)
          return cached
        }
        console.log('[cache miss] text vault', vaultId)
      }
      const fresh = await analyzeVoice(text)
      await saveToCache(userId, text, 'text', fresh)
      return fresh
    }).catch(async (err) => {
      const errMsg = err instanceof Error ? err.message : String(err)
      await supabaseAdmin
        .from('brand_vaults')
        .update({ error_message: errMsg })
        .eq('id', vaultId)
        .eq('user_id', userId)
      throw err
    })

    // Step 2: Save to Database
    await step.run('save-to-supabase', async () => {
      const systemPrompt = voiceProfile.system_prompt_cache

      const { error } = await supabaseAdmin
        .from('brand_vaults')
        .update({
          voice_profile: voiceProfile,
          system_prompt: systemPrompt,
          is_active: true,
        })
        .eq('id', vaultId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Supabase Error: ${error.message}`)
      }
    })

    return { success: true, vaultId }
  }
)

// ─── Event: Analyze URL ───
// `timeouts.start` caps the first attempt at 60s and `timeouts.finish` caps the
// total workflow at 120s. This prevents a 15-minute Readability hang from
// stalling the workflow indefinitely (known issue with e-commerce pages).
// On failure, Inngest still has `retries: 1`, after which the onboarding
// page polling logic detects the still-empty voice_profile and surfaces a
// friendly error to the user.
export const analyzeBrandVaultUrl = inngest.createFunction(
  {
    id: 'analyze-brand-vault-url',
    retries: 1,
    timeouts: {
      start: '60s',
      finish: '120s',
    },
  },
  { event: 'brand_vault/analyze.url' },
  async ({ event, step }) => {
    const { url, userId, vaultId, forceRefresh } = event.data

    // Step 1: Scrape URL (with structured failure reporting so the onboarding
    // polling loop can show a real reason instead of a generic "incompatible
    // page" error).
    let text = ''
    try {
      text = await step.run('scrape-url', async () => {
        return await extractTextFromUrl(url)
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      await supabaseAdmin
        .from('brand_vaults')
        .update({ error_message: errMsg })
        .eq('id', vaultId)
        .eq('user_id', userId)
      throw err
    }

    // Step 2: Analyze text (with cache layer + structured failure reporting)
    const voiceProfile = await step.run('analyze-voice-with-ai', async () => {
      if (!forceRefresh) {
        const cached = await getCachedProfile(userId, text, 'url')
        if (cached) {
          console.log('[cache hit] url vault', vaultId)
          return cached
        }
        console.log('[cache miss] url vault', vaultId)
      }
      const fresh = await analyzeVoice(text)
      await saveToCache(userId, text, 'url', fresh)
      return fresh
    }).catch(async (err) => {
      // Mirror the scrape-url error path: persist a reason to the vault row so
      // the onboarding polling loop can surface it. Without this, a Gemini
      // failure would leave the row as (voice_profile=null, is_active=false,
      // error_message=null) and the user would see the generic "URL
      // incompatible" message forever, with no real reason to debug.
      const errMsg = err instanceof Error ? err.message : String(err)
      await supabaseAdmin
        .from('brand_vaults')
        .update({ error_message: errMsg })
        .eq('id', vaultId)
        .eq('user_id', userId)
      throw err
    })

    // Step 3: Save to Database
    await step.run('save-to-supabase', async () => {
      const systemPrompt = voiceProfile.system_prompt_cache

      const { error } = await supabaseAdmin
        .from('brand_vaults')
        .update({
          voice_profile: voiceProfile,
          system_prompt: systemPrompt,
          is_active: true,
        })
        .eq('id', vaultId)
        .eq('user_id', userId)

      if (error) {
        throw new Error(`Supabase Error: ${error.message}`)
      }
    })

    return { success: true, vaultId }
  },
)
