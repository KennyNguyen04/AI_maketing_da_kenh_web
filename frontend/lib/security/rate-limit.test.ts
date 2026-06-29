import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  formatRetryAfter,
} from './rate-limit'

describe('security/rate-limit', () => {
  beforeEach(() => {
    // Clear all amplify_rl:* keys
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-29T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    it('allows the first call for a new identifier', () => {
      const result = checkRateLimit('login', 'user@example.com')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
    })

    it('returns retryAfterMs > 0 when locked', () => {
      // Exhaust 5 attempts
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt('login', 'user@example.com')
      }
      const result = checkRateLimit('login', 'user@example.com')
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBeGreaterThan(0)
      expect(result.remaining).toBe(0)
    })

    it('lowercases the identifier for storage', () => {
      recordFailedAttempt('login', 'User@Example.COM')
      const a = checkRateLimit('login', 'USER@example.com')
      const b = checkRateLimit('login', 'user@example.com')
      expect(a.remaining).toBe(b.remaining)
    })

    it('treats different actions separately', () => {
      recordFailedAttempt('login', 'user@example.com')
      const login = checkRateLimit('login', 'user@example.com')
      const register = checkRateLimit('register', 'user@example.com')
      expect(register.allowed).toBe(true)
      expect(login.remaining).toBeLessThan(5)
    })
  })

  describe('recordFailedAttempt', () => {
    it('decrements remaining on each failure', () => {
      const r1 = recordFailedAttempt('login', 'a@b.com')
      expect(r1.remaining).toBe(4)
      const r2 = recordFailedAttempt('login', 'a@b.com')
      expect(r2.remaining).toBe(3)
      const r3 = recordFailedAttempt('login', 'a@b.com')
      expect(r3.remaining).toBe(2)
    })

    it('locks after maxAttempts (default 5)', () => {
      let result
      for (let i = 0; i < 5; i++) {
        result = recordFailedAttempt('login', 'a@b.com')
      }
      expect(result!.allowed).toBe(false)
      expect(result!.retryAfterMs).toBe(15 * 60 * 1000) // default lockoutMs
    })

    it('respects custom config (maxAttempts=2)', () => {
      const r1 = recordFailedAttempt('login', 'a@b.com', { maxAttempts: 2 })
      expect(r1.allowed).toBe(true)
      const r2 = recordFailedAttempt('login', 'a@b.com', { maxAttempts: 2 })
      expect(r2.allowed).toBe(false)
      expect(r2.retryAfterMs).toBeGreaterThan(0)
    })
  })

  describe('windowMs reset behaviour', () => {
    it('resets attempts after windowMs elapses', () => {
      recordFailedAttempt('login', 'a@b.com')
      recordFailedAttempt('login', 'a@b.com')
      const before = checkRateLimit('login', 'a@b.com')
      expect(before.remaining).toBe(3)

      // Advance past the default 15-min window
      vi.advanceTimersByTime(16 * 60 * 1000)

      const after = checkRateLimit('login', 'a@b.com')
      expect(after.allowed).toBe(true)
      expect(after.remaining).toBe(5)
    })

    it('releases lockout after lockoutMs elapses', () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt('login', 'a@b.com')
      }
      expect(checkRateLimit('login', 'a@b.com').allowed).toBe(false)

      // Advance past lockout (15 min default)
      vi.advanceTimersByTime(16 * 60 * 1000)

      expect(checkRateLimit('login', 'a@b.com').allowed).toBe(true)
    })
  })

  describe('recordSuccessfulAttempt', () => {
    it('clears the rate-limit record', () => {
      recordFailedAttempt('login', 'a@b.com')
      recordFailedAttempt('login', 'a@b.com')
      expect(checkRateLimit('login', 'a@b.com').remaining).toBe(3)

      recordSuccessfulAttempt('login', 'a@b.com')

      expect(checkRateLimit('login', 'a@b.com').remaining).toBe(5)
    })
  })
})

describe('formatRetryAfter', () => {
  it('returns "1 phút / 1 minute" for values that round up to a minute', () => {
    // Math.ceil(30000/60000) === 1
    expect(formatRetryAfter(30_000)).toBe('1 phút / 1 minute')
    expect(formatRetryAfter(1)).toBe('1 phút / 1 minute')
  })

  it('returns "1 phút / 1 minute" for exactly 60s', () => {
    expect(formatRetryAfter(60_000)).toBe('1 phút / 1 minute')
  })

  it('returns "N phút / N minutes" for values > 60s', () => {
    expect(formatRetryAfter(120_000)).toBe('2 phút / 2 minutes')
    expect(formatRetryAfter(900_000)).toBe('15 phút / 15 minutes')
  })
})
