import { describe, it, expect } from 'vitest'
import { createHash, randomBytes } from 'crypto'
import {
  createOAuthState,
  isOAuthStateValid,
  createCodeVerifier,
  createCodeChallenge,
  addQueryParams,
  timingSafeEqualString,
} from './oauth'

describe('oauth utilities', () => {
  describe('createOAuthState', () => {
    it('returns a string with format `${timestamp}:${nonce}`', () => {
      const state = createOAuthState()
      const parts = state.split(':')
      expect(parts).toHaveLength(2)
      // First part: base36 timestamp (parsable)
      expect(Number.isNaN(parseInt(parts[0], 36))).toBe(false)
      // Second part: 32-char hex nonce
      expect(parts[1]).toMatch(/^[a-f0-9]{32}$/)
    })

    it('produces different nonces across calls (randomness)', () => {
      const a = createOAuthState()
      const b = createOAuthState()
      expect(a).not.toBe(b)
    })
  })

  describe('isOAuthStateValid', () => {
    it('returns true for a freshly minted state', () => {
      const state = createOAuthState()
      expect(isOAuthStateValid(state)).toBe(true)
    })

    it('returns false for state older than 10 minutes', () => {
      // Build a state 11 minutes old
      const oldTimestamp = (Date.now() - 11 * 60 * 1000).toString(36)
      const nonce = randomBytes(16).toString('hex')
      const oldState = `${oldTimestamp}:${nonce}`
      expect(isOAuthStateValid(oldState)).toBe(false)
    })

    it('returns false for malformed state (missing colon)', () => {
      expect(isOAuthStateValid('not-a-state')).toBe(false)
    })

    it('returns false for state with non-numeric timestamp', () => {
      expect(isOAuthStateValid('not-hex:abc123')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isOAuthStateValid('')).toBe(false)
    })

    it('returns true when expectedState matches (constant-time compare)', () => {
      const state = createOAuthState()
      expect(isOAuthStateValid(state, state)).toBe(true)
    })

    it('returns false when expectedState does not match', () => {
      const state = createOAuthState()
      const other = createOAuthState()
      expect(isOAuthStateValid(state, other)).toBe(false)
    })

    it('returns false when expectedState is wrong length (timing-safe)', () => {
      const state = createOAuthState()
      expect(isOAuthStateValid(state, 'short')).toBe(false)
    })
  })

  describe('createCodeVerifier', () => {
    it('returns a 43-character base64url string (32 bytes)', () => {
      const verifier = createCodeVerifier()
      // 32 bytes -> base64url without padding = 43 chars
      expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    })

    it('produces different verifiers across calls', () => {
      expect(createCodeVerifier()).not.toBe(createCodeVerifier())
    })
  })

  describe('createCodeChallenge', () => {
    it('matches SHA256(verifier) encoded as base64url', () => {
      const verifier = createCodeVerifier()
      const expected = createHash('sha256').update(verifier).digest('base64url')
      expect(createCodeChallenge(verifier)).toBe(expected)
    })

    it('is deterministic for the same verifier', () => {
      const verifier = 'fixed-test-verifier-string-padding-to-meet-length-requirement'
      expect(createCodeChallenge(verifier)).toBe(createCodeChallenge(verifier))
    })
  })

  describe('addQueryParams', () => {
    it('preserves pathname and merges with existing query params', () => {
      const url = addQueryParams('https://example.com/oauth?old=1', {
        new: '2',
        another: '3',
      })
      expect(url).toContain('https://example.com/oauth')
      expect(url).toContain('old=1')
      expect(url).toContain('new=2')
      expect(url).toContain('another=3')
    })

    it('overrides a key if it already exists', () => {
      const url = addQueryParams('https://example.com/oauth?state=OLD', {
        state: 'NEW',
      })
      expect(url).toContain('state=NEW')
      expect(url).not.toContain('state=OLD')
    })

    it('adds params to a URL with no query string', () => {
      const url = addQueryParams('https://example.com/path', { a: 'b' })
      expect(url).toBe('https://example.com/path?a=b')
    })

    it('URL-encodes special characters (form-style)', () => {
      const url = addQueryParams('https://example.com/x', { q: 'hello world&foo=bar' })
      // URLSearchParams uses + for space (form-encoded) and %26 for &; both are
      // valid in query strings. We assert the literal result.
      expect(url).toBe('https://example.com/x?q=hello+world%26foo%3Dbar')
    })
  })

  describe('timingSafeEqualString', () => {
    it('returns true for identical strings', () => {
      expect(timingSafeEqualString('abc', 'abc')).toBe(true)
    })

    it('returns false for different strings of same length', () => {
      expect(timingSafeEqualString('abc', 'abd')).toBe(false)
    })

    it('returns false for different length strings', () => {
      expect(timingSafeEqualString('short', 'longer-string')).toBe(false)
    })

    it('returns true for two empty strings', () => {
      expect(timingSafeEqualString('', '')).toBe(true)
    })

    it('returns false when one side is empty', () => {
      expect(timingSafeEqualString('', 'non-empty')).toBe(false)
      expect(timingSafeEqualString('non-empty', '')).toBe(false)
    })

    it('is robust against non-ASCII differences', () => {
      expect(timingSafeEqualString('café', 'cafe')).toBe(false)
    })

    it('runs in roughly constant time (smoke test)', () => {
      const a = 'a'.repeat(1000)
      // Run 100000 comparisons; should not throw or vary wildly.
      // We just assert it completes in reasonable time and returns expected.
      const start = Date.now()
      let trueCount = 0
      for (let i = 0; i < 100_000; i++) {
        if (timingSafeEqualString(a, a)) trueCount++
      }
      const elapsed = Date.now() - start
      expect(trueCount).toBe(100_000)
      // 100k iterations of 1000-char compare should be well under 5s
      expect(elapsed).toBeLessThan(5000)
    })
  })
})
