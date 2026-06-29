import { GoogleGenAI } from '@google/genai'
import type { GenerationConfig } from './config'
import { logEvent } from '@/lib/observability/logger'

// Use gemini-2.5-flash as tested in POC
export const MODEL_NAME = 'gemini-2.5-flash'

// Per-attempt timeout: Google GenAI SDK hangs indefinitely otherwise.
// 30s covers normal Gemini 2.5 Flash latency (p95 ~10-15s) plus buffer.
const ATTEMPT_TIMEOUT_MS = 30_000

// Total wall-clock budget across all retries: 4 retries × 30s + 4 × 24s backoff = ~216s
// We cap at 180s (3 min) to keep serverless functions within typical limits.
const TOTAL_TIMEOUT_MS = 180_000

export const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
})

class AiTimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message)
    this.name = 'AiTimeoutError'
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AiTimeoutError(`${label} timed out after ${ms}ms`, ms))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * Wrapper around GoogleGenAI.models.generateContent with exponential backoff retry
 * AND strict timeouts (per-attempt + total wall-clock).
 *
 * Backoff schedule: 1.5s → 3s → 6s → 12s (capped via Math.min)
 *
 * Throws AiTimeoutError if any single attempt exceeds ATTEMPT_TIMEOUT_MS,
 * or if the entire operation exceeds TOTAL_TIMEOUT_MS.
 */
export async function generateContentWithRetry(
  model: string,
  contents: string,
  maxRetries = 4,
  config?: GenerationConfig,
) {
  const startedAt = Date.now()
  let attempt = 0
  while (attempt <= maxRetries) {
    const elapsed = Date.now() - startedAt
    if (elapsed >= TOTAL_TIMEOUT_MS) {
      throw new AiTimeoutError(
        `AI generation exceeded total budget of ${TOTAL_TIMEOUT_MS}ms after ${attempt} attempts`,
        TOTAL_TIMEOUT_MS,
      )
    }
    const remaining = TOTAL_TIMEOUT_MS - elapsed

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config: config ? {
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens,
            topP: config.topP,
            topK: config.topK,
          } : undefined,
        }),
        Math.min(ATTEMPT_TIMEOUT_MS, remaining),
        `generateContent attempt ${attempt + 1}`,
      )
      return response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      attempt++
      const errorMsg = error?.message || String(error)
      const isTimeout = error instanceof AiTimeoutError
      const isRetryable = isTimeout
        || errorMsg.includes('503')
        || errorMsg.includes('429')
        || errorMsg.includes('UNAVAILABLE')
        || errorMsg.includes('RESOURCE_EXHAUSTED')
        || errorMsg.includes('timeout')
        || errorMsg.includes('ETIMEDOUT')

      if (attempt > maxRetries || !isRetryable) {
        throw error
      }

      // Capped exponential backoff: 1.5s, 3s, 6s, 12s, max 12s
      const delay = Math.min(Math.pow(2, attempt) * 1500, 12_000)
      logEvent('ai.retry', {
        attempt,
        maxRetries,
        retryable: isRetryable,
        delayMs: delay,
        elapsedMs: Date.now() - startedAt,
        error: errorMsg.substring(0, 200), // truncate to avoid log bloat
      })
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error('All AI retries exhausted')
}

export { AiTimeoutError }
