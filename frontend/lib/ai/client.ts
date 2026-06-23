import { GoogleGenAI } from '@google/genai'

// Use gemini-2.5-flash as tested in POC
export const MODEL_NAME = 'gemini-2.5-flash'

export const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
})

/**
 * Wrapper around GoogleGenAI.models.generateContent with exponential backoff retry.
 * Retries up to `maxRetries` times on transient errors (503, 429, UNAVAILABLE, RESOURCE_EXHAUSTED).
 * Backoff schedule: 3s → 6s → 12s → 24s
 */
export async function generateContentWithRetry(model: string, contents: string, maxRetries = 4) {
  let attempt = 0
  while (attempt <= maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
      })
      return response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      attempt++
      const errorMsg = error.message || String(error)
      const isRetryable = errorMsg.includes('503') || errorMsg.includes('429') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('RESOURCE_EXHAUSTED')
      
      if (attempt > maxRetries || !isRetryable) {
        throw error
      }
      
      // Exponential backoff: 3s, 6s, 12s, 24s
      const delay = Math.pow(2, attempt) * 1500
      console.log(`[AI Retry] Attempt ${attempt}/${maxRetries} failed (${isRetryable ? 'retryable' : 'unknown'}). Retrying in ${delay / 1000}s...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error('All AI retries exhausted')
}
