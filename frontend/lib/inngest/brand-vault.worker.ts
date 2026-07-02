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

    // Step 1: Analyze text using Gemini (with cache layer)
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
export const analyzeBrandVaultUrl = inngest.createFunction(
  { id: 'analyze-brand-vault-url', retries: 3 },
  { event: 'brand_vault/analyze.url' },
  async ({ event, step }) => {
    const { url, userId, vaultId, forceRefresh } = event.data

    // Step 1: Scrape URL
    const text = await step.run('scrape-url', async () => {
      return await extractTextFromUrl(url)
    })

    // Step 2: Analyze text (with cache layer)
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
  }
)
