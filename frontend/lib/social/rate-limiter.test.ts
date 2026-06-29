import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter, PROVIDER_CONFIGS, rateLimiter } from './rate-limiter'

describe('lib/social/rate-limiter: PROVIDER_CONFIGS', () => {
  it('has correct limit for X (50 per 6h)', () => {
    expect(PROVIDER_CONFIGS.x.limit).toBe(50)
    expect(PROVIDER_CONFIGS.x.windowMinutes).toBe(360)
    expect(PROVIDER_CONFIGS.x.minDelayMinutes).toBe(30)
  })

  it('has correct limit for Facebook (25 per 24h)', () => {
    expect(PROVIDER_CONFIGS.facebook.limit).toBe(25)
    expect(PROVIDER_CONFIGS.facebook.windowMinutes).toBe(1440)
    expect(PROVIDER_CONFIGS.facebook.minDelayMinutes).toBe(15)
  })

  it('exports only configured providers', () => {
    expect(Object.keys(PROVIDER_CONFIGS)).toEqual(['x', 'facebook'])
  })
})

describe('lib/social/rate-limiter: RateLimiter class', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter()
  })

  it('canPost returns allowed: true for fresh user+provider', () => {
    const result = limiter.canPost('user-1', 'x')
    expect(result.allowed).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('canPost allows for unknown provider (with console.warn)', () => {
    const result = limiter.canPost('user-1', 'unknown-platform')
    expect(result.allowed).toBe(true)
  })

  it('recordPost increments count', () => {
    limiter.recordPost('user-1', 'x')
    limiter.recordPost('user-1', 'x')
    expect(limiter.getRemainingPosts('user-1', 'x')).toBe(48) // 50 - 2
  })

  it('getRemainingPosts returns Infinity for unknown provider', () => {
    expect(limiter.getRemainingPosts('user-1', 'unknown-platform')).toBe(Infinity)
  })

  it('getRemainingPosts decrements after recordPost', () => {
    limiter.recordPost('user-1', 'facebook')
    expect(limiter.getRemainingPosts('user-1', 'facebook')).toBe(24) // 25 - 1
  })

  it('getRemainingPosts returns 0 at limit', () => {
    for (let i = 0; i < 25; i++) limiter.recordPost('user-1', 'facebook')
    expect(limiter.getRemainingPosts('user-1', 'facebook')).toBe(0)
  })

  it('getRemainingPosts never returns negative', () => {
    for (let i = 0; i < 30; i++) limiter.recordPost('user-1', 'facebook')
    expect(limiter.getRemainingPosts('user-1', 'facebook')).toBe(0)
  })

  it('canPost returns allowed: false when limit exceeded', () => {
    for (let i = 0; i < 25; i++) limiter.recordPost('user-1', 'facebook')
    const result = limiter.canPost('user-1', 'facebook')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/Rate limit/)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('canPost enforces min delay between posts', () => {
    limiter.recordPost('user-1', 'x')
    // Immediately try to post again
    const result = limiter.canPost('user-1', 'x')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/wait/i)
  })

  it('clear() removes specific user+provider entry', () => {
    limiter.recordPost('user-1', 'x')
    limiter.clear('user-1', 'x')
    expect(limiter.getRemainingPosts('user-1', 'x')).toBe(50)
  })

  it('clearAll() resets all entries', () => {
    limiter.recordPost('user-1', 'x')
    limiter.recordPost('user-2', 'facebook')
    limiter.clearAll()
    expect(limiter.getRemainingPosts('user-1', 'x')).toBe(50)
    expect(limiter.getRemainingPosts('user-2', 'facebook')).toBe(25)
  })

  it('isolates rate limits per user', () => {
    for (let i = 0; i < 25; i++) limiter.recordPost('user-1', 'facebook')
    // user-2 is independent
    expect(limiter.canPost('user-2', 'facebook').allowed).toBe(true)
  })

  it('isolates rate limits per provider', () => {
    for (let i = 0; i < 25; i++) limiter.recordPost('user-1', 'facebook')
    // user-1 on X is independent
    expect(limiter.canPost('user-1', 'x').allowed).toBe(true)
  })

  it('getResetTime returns Date object', () => {
    limiter.recordPost('user-1', 'x')
    const reset = limiter.getResetTime('user-1', 'x')
    expect(reset).toBeInstanceOf(Date)
    expect(reset!.getTime()).toBeGreaterThan(Date.now())
  })

  it('getTimeUntilNextPost returns null when no recent post', () => {
    expect(limiter.getTimeUntilNextPost('user-1', 'x')).toBeNull()
  })

  it('getTimeUntilNextPost returns ms after recent post (within minDelay)', () => {
    limiter.recordPost('user-1', 'x')
    const untilNext = limiter.getTimeUntilNextPost('user-1', 'x')
    expect(untilNext).not.toBeNull()
    expect(untilNext!).toBeGreaterThan(0)
    expect(untilNext!).toBeLessThanOrEqual(30 * 60 * 1000) // 30 min max
  })
})

describe('lib/social/rate-limiter: rateLimiter singleton', () => {
  it('exports a RateLimiter instance', () => {
    expect(rateLimiter).toBeInstanceOf(RateLimiter)
  })

  it('singleton has working canPost', () => {
    const result = rateLimiter.canPost('singleton-test', 'x')
    expect(result.allowed).toBe(true)
    rateLimiter.clear('singleton-test', 'x') // cleanup
  })
})