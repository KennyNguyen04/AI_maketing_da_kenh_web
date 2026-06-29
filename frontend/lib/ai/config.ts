/**
 * AI Generation Configuration
 * Platform-specific settings for Gemini model
 */

export interface GenerationConfig {
  temperature: number
  maxTokens: number
  topP?: number
  topK?: number
}

/**
 * Platform-specific AI configuration
 * Tuned for each social media channel
 */
export const AI_GENERATION_CONFIG: Record<string, GenerationConfig> = {
  // LinkedIn single post - balanced creativity and coherence
  linkedin_post: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.95,
    topK: 40,
  },

  // LinkedIn thread - structured multi-post format
  linkedin_thread: {
    temperature: 0.7,
    maxTokens: 5000,
    topP: 0.95,
    topK: 40,
  },

  // LinkedIn carousel format
  linkedin_carousel: {
    temperature: 0.7,
    maxTokens: 4000,
    topP: 0.95,
    topK: 40,
  },

  // Facebook - casual, storytelling approach
  facebook: {
    temperature: 0.75,
    maxTokens: 2500,
    topP: 0.95,
    topK: 40,
  },

  // X (Twitter) - concise, witty, controlled randomness
  x: {
    temperature: 0.6,
    maxTokens: 500,
    topP: 0.9,
    topK: 20,
  },

  // X thread
  x_thread: {
    temperature: 0.65,
    maxTokens: 2000,
    topP: 0.9,
    topK: 20,
  },

  // Instagram
  instagram: {
    temperature: 0.75,
    maxTokens: 2500,
    topP: 0.95,
    topK: 40,
  },
}

/**
 * Get generation config for a channel, with fallback to defaults
 */
export function getGenerationConfig(channel: string): GenerationConfig {
  return AI_GENERATION_CONFIG[channel] || {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.95,
    topK: 40,
  }
}

/**
 * Voice analysis config - deterministic for consistent results
 */
export const VOICE_ANALYSIS_CONFIG: GenerationConfig = {
  temperature: 0.3,
  maxTokens: 1024,
  topP: 0.95,
  topK: 32,
}

/**
 * Default config for any unspecified channel
 */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
  topK: 40,
}
