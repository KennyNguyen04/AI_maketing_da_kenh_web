import { describe, it, expect } from 'vitest'
import { AI_GENERATION_CONFIG, getGenerationConfig, VOICE_ANALYSIS_CONFIG, DEFAULT_GENERATION_CONFIG } from './config'

describe('lib/ai/config: AI_GENERATION_CONFIG', () => {
  it('exports config for all required channels', () => {
    const expectedChannels = ['linkedin_post', 'linkedin_thread', 'linkedin_carousel', 'facebook', 'x', 'x_thread', 'instagram']
    for (const channel of expectedChannels) {
      expect(AI_GENERATION_CONFIG[channel]).toBeDefined()
    }
  })

  it('each config has required fields', () => {
    for (const [name, cfg] of Object.entries(AI_GENERATION_CONFIG)) {
      expect(cfg.temperature, `${name} should have temperature`).toBeTypeOf('number')
      expect(cfg.maxTokens, `${name} should have maxTokens`).toBeTypeOf('number')
      expect(cfg.temperature).toBeGreaterThan(0)
      expect(cfg.temperature).toBeLessThanOrEqual(1)
      expect(cfg.maxTokens).toBeGreaterThan(0)
    }
  })

  it('X config has lowest maxTokens (concise platform)', () => {
    expect(AI_GENERATION_CONFIG.x.maxTokens).toBeLessThanOrEqual(AI_GENERATION_CONFIG.facebook.maxTokens)
  })

  it('X config has lower temperature (more controlled)', () => {
    expect(AI_GENERATION_CONFIG.x.temperature).toBeLessThanOrEqual(AI_GENERATION_CONFIG.facebook.temperature)
  })

  it('LinkedIn thread has highest maxTokens (long format)', () => {
    expect(AI_GENERATION_CONFIG.linkedin_thread.maxTokens).toBeGreaterThanOrEqual(AI_GENERATION_CONFIG.linkedin_post.maxTokens)
  })

  it('topP and topK are within sane ranges when defined', () => {
    for (const [name, cfg] of Object.entries(AI_GENERATION_CONFIG)) {
      if (cfg.topP !== undefined) {
        expect(cfg.topP, `${name} topP`).toBeGreaterThan(0)
        expect(cfg.topP, `${name} topP`).toBeLessThanOrEqual(1)
      }
      if (cfg.topK !== undefined) {
        expect(cfg.topK, `${name} topK`).toBeGreaterThan(0)
        expect(cfg.topK, `${name} topK`).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('lib/ai/config: getGenerationConfig', () => {
  it('returns config for known channel', () => {
    expect(getGenerationConfig('x')).toEqual(AI_GENERATION_CONFIG.x)
  })

  it('returns default for unknown channel', () => {
    const result = getGenerationConfig('unknown-channel')
    expect(result.temperature).toBe(0.7)
    expect(result.maxTokens).toBe(2048)
  })

  it('returns different config for different channels', () => {
    const x = getGenerationConfig('x')
    const fb = getGenerationConfig('facebook')
    expect(x.maxTokens).not.toBe(fb.maxTokens)
  })

  it('returns same config object for known channel (caller should not mutate)', () => {
    // Function returns reference, not copy. Caller must not mutate to avoid
    // side effects across calls.
    const a = getGenerationConfig('x')
    const b = getGenerationConfig('x')
    expect(a).toEqual(b)
  })
})

describe('lib/ai/config: VOICE_ANALYSIS_CONFIG', () => {
  it('has lower temperature than creative content generation', () => {
    // Voice analysis is deterministic
    expect(VOICE_ANALYSIS_CONFIG.temperature).toBeLessThan(AI_GENERATION_CONFIG.x.temperature)
  })

  it('has reasonable maxTokens for analysis task', () => {
    // Voice analysis returns a JSON object with a long `system_prompt_cache` field.
    // 1024 was too low — Gemini would truncate mid-string, breaking JSON.parse.
    // We allow up to 4096 so the full response fits.
    expect(VOICE_ANALYSIS_CONFIG.maxTokens).toBeGreaterThanOrEqual(2048)
    expect(VOICE_ANALYSIS_CONFIG.maxTokens).toBeLessThanOrEqual(4096)
  })
})

describe('lib/ai/config: DEFAULT_GENERATION_CONFIG', () => {
  it('is used as fallback for unknown channels', () => {
    expect(getGenerationConfig('totally-fake')).toEqual(DEFAULT_GENERATION_CONFIG)
  })

  it('has all required fields', () => {
    expect(DEFAULT_GENERATION_CONFIG.temperature).toBeTypeOf('number')
    expect(DEFAULT_GENERATION_CONFIG.maxTokens).toBeTypeOf('number')
    expect(DEFAULT_GENERATION_CONFIG.topP).toBeTypeOf('number')
    expect(DEFAULT_GENERATION_CONFIG.topK).toBeTypeOf('number')
  })
})