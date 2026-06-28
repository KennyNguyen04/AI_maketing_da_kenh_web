/**
 * AI Service — Public API
 * Re-exports all AI functions used by the rest of the application.
 */

import { generateContentWithRetry, MODEL_NAME } from './client'
import { getGenerationConfig, VOICE_ANALYSIS_CONFIG } from './config'
import { VOICE_ANALYSIS_PROMPT, VOICE_FROM_FORM_PROMPT, REPURPOSE_PROMPT_TEMPLATES } from './prompts'
import { cleanAndParseJson } from './parser'

/**
 * Analyze a text sample to extract a VoiceProfile JSON.
 */
export async function analyzeVoice(text: string) {
  try {
    const response = await generateContentWithRetry(
      MODEL_NAME,
      VOICE_ANALYSIS_PROMPT + text,
      4,
      VOICE_ANALYSIS_CONFIG
    )

    const responseText = response.text || ''
    const data = cleanAndParseJson(responseText)
    
    // Basic validation
    if (!data.tone || !data.system_prompt_cache) {
      throw new Error('Invalid JSON schema returned from AI')
    }
    
    return data
  } catch (error) {
    console.error('AI Analysis Error:', error)
    throw error
  }
}

/**
 * Analyze form questionnaire answers to generate a VoiceProfile JSON.
 */
export async function analyzeVoiceFromForm(data: { topics: string; tone: string; audience: string; style: string; samples: string }) {
  try {
    const prompt = VOICE_FROM_FORM_PROMPT
      .replace('{topics}', data.topics || 'Chưa cung cấp')
      .replace('{tone}', data.tone || 'Chưa cung cấp')
      .replace('{audience}', data.audience || 'Chưa cung cấp')
      .replace('{style}', data.style || 'Chưa cung cấp')
      .replace('{samples}', data.samples || 'Chưa cung cấp')

    const response = await generateContentWithRetry(
      MODEL_NAME,
      prompt,
      4,
      VOICE_ANALYSIS_CONFIG
    )

    const responseText = response.text || ''
    const parsedData = cleanAndParseJson(responseText)
    
    // Basic validation
    if (!parsedData.tone || !parsedData.system_prompt_cache) {
      throw new Error('Invalid JSON schema returned from AI')
    }
    
    return parsedData
  } catch (error) {
    console.error('AI Form Analysis Error:', error)
    throw error
  }
}

/**
 * Generate repurposed content for a specific social media channel.
 */
export async function repurposeContentAI(systemPrompt: string, sourceContent: string, channel: string) {
  const instructions = REPURPOSE_PROMPT_TEMPLATES[channel]
  if (!instructions) throw new Error(`Unknown channel: ${channel}`)

  // Get platform-specific generation config
  const genConfig = getGenerationConfig(channel)

  const prompt = `System: ${systemPrompt}

User: Dựa trên bài viết gốc dưới đây, hãy viết lại nội dung phù hợp.
${instructions}

Bài viết gốc:
${sourceContent}`

  try {
    const response = await generateContentWithRetry(
      MODEL_NAME,
      prompt,
      4,
      genConfig
    )

    return response.text || ''
  } catch (error) {
    console.error(`AI Repurpose Error [${channel}]:`, error)
    throw error
  }
}
