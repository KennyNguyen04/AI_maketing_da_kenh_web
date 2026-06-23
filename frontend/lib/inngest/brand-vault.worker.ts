/**
 * Inngest Workers — Brand Vault Analysis
 * Handles: analyze text, analyze URL
 */

import { inngest } from './client'
import { analyzeVoice } from '@/lib/ai'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { extractTextFromUrl } from './helpers'

// ─── Event: Analyze Text ───
export const analyzeBrandVaultText = inngest.createFunction(
  { id: 'analyze-brand-vault-text' },
  { event: 'brand_vault/analyze.text' },
  async ({ event, step }) => {
    const { text, userId, vaultId } = event.data

    // Step 1: Analyze text using Gemini
    const voiceProfile = await step.run('analyze-voice-with-ai', async () => {
      return await analyzeVoice(text)
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
  { id: 'analyze-brand-vault-url' },
  { event: 'brand_vault/analyze.url' },
  async ({ event, step }) => {
    const { url, userId, vaultId } = event.data

    // Step 1: Scrape URL
    const text = await step.run('scrape-url', async () => {
      return await extractTextFromUrl(url)
    })

    // Step 2: Analyze text
    const voiceProfile = await step.run('analyze-voice-with-ai', async () => {
      return await analyzeVoice(text)
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
