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
 *
 * Updated 14jul 2026:
 *   - facebook: temperature 0.75→0.85 (sáng tạo hơn), maxTokens 2500→3500 (không truncate 200-400 từ + 3 đoạn văn)
 *   - instagram: maxTokens 2500→3500 (caption dài hơn)
 *   - linkedin_post: maxTokens 2000→3500 (200-400 từ + 2-3 insight)
 *   - thêm facebook-group + threads (automator có sẵn, trước đó fallback default)
 *
 * Updated 15jul 2026:
 *   - thêm 'twitter' alias cùng config với 'x' (NewJobForm gửi id='twitter' nhưng
 *     prompt + config giờ y hệt 'x' để draft chuẩn 70-130 chars theo persona)
 */
export const AI_GENERATION_CONFIG: Record<string, GenerationConfig> = {
  // LinkedIn single post - balanced creativity and coherence
  linkedin_post: {
    temperature: 0.7,
    maxTokens: 3500, // was 2000
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

  // Facebook - casual, storytelling. maxTokens dùng cho persona muốn dài,
  // nhưng prompt đã siết sweet-spot 50-90 từ + KHÔNG vượt 120 từ (15jul 2026:
  // user yêu cầu FB ngắn lại — trước đó output dài 110-120 từ/4 đoạn).
  facebook: {
    temperature: 0.85,
    maxTokens: 3500,
    topP: 0.95,
    topK: 40,
  },

  // Facebook Group - tone cộng đồng, khuyến khích thảo luận
  'facebook-group': {
    temperature: 0.75,
    maxTokens: 3000,
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

  // Alias 'twitter' → cùng config với 'x' (form chọn label "X" với id 'twitter',
  // nhưng prompt + config phải đồng nhất để draft chuẩn 70-130 chars).
  twitter: {
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

  // Instagram - nâng maxTokens cho caption 200-400 từ
  instagram: {
    temperature: 0.75,
    maxTokens: 3500, // was 2500
    topP: 0.95,
    topK: 40,
  },

  // Threads - casual, Gen-Z
  threads: {
    temperature: 0.8,
    maxTokens: 3000,
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
 * Voice analysis config - deterministic for consistent results.
 * maxTokens increased from 1024 to 4096 because `system_prompt_cache` alone can
 * easily exceed 500 tokens and Gemini 2.5 Flash would otherwise truncate the
 * JSON mid-string, causing parse failures on Vercel.
 */
export const VOICE_ANALYSIS_CONFIG: GenerationConfig = {
  temperature: 0.3,
  maxTokens: 4096,
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
