import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encryptToken, decryptToken } from './crypto'

describe('crypto: encryptToken / decryptToken', () => {
  const ORIGINAL_KEY = process.env.TOKEN_ENCRYPTION_KEY

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = 'test-key-for-unit-tests-only-32+chars-long'
  })

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.TOKEN_ENCRYPTION_KEY
    } else {
      process.env.TOKEN_ENCRYPTION_KEY = ORIGINAL_KEY
    }
  })

  describe('encryptToken', () => {
    it('produces a 3-part base64 string separated by dots', () => {
      const ct = encryptToken('hello')
      const parts = ct.split('.')
      expect(parts).toHaveLength(3)
      expect(parts.every((p) => /^[A-Za-z0-9+/=]+$/.test(p))).toBe(true)
    })

    it('throws when TOKEN_ENCRYPTION_KEY is missing', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY
      expect(() => encryptToken('hello')).toThrow(/TOKEN_ENCRYPTION_KEY/)
    })

    it('produces different ciphertexts for the same plaintext (IV randomness)', () => {
      const a = encryptToken('same-input')
      const b = encryptToken('same-input')
      expect(a).not.toBe(b)
    })
  })

  describe('decryptToken', () => {
    it('round-trips for various input lengths', () => {
      const inputs = [
        'x',
        'short',
        'A'.repeat(100),
        'A'.repeat(1000),
        'unicode: xin chào 🎉',
        JSON.stringify({ a: 1, b: [1, 2, 3] }),
        'a-very-long-base64url-style-token_1234567890abcdefghijklmnopqrstuvwxyz',
      ]
      for (const input of inputs) {
        const ct = encryptToken(input)
        expect(decryptToken(ct)).toBe(input)
      }
    })

    it('throws on malformed ciphertext (wrong number of parts)', () => {
      expect(() => decryptToken('only-one-part')).toThrow(/Invalid encrypted token/)
      expect(() => decryptToken('a.b')).toThrow(/Invalid encrypted token/)
    })

    it('throws when ciphertext is tampered', () => {
      const ct = encryptToken('important')
      const [iv, tag, encrypted] = ct.split('.')
      // Flip a char in the encrypted portion
      const tamperedEncrypted = encrypted.slice(0, -2) + (encrypted.endsWith('A') ? 'B' : 'A') + encrypted.slice(-1)
      expect(() => decryptToken(`${iv}.${tag}.${tamperedEncrypted}`)).toThrow()
    })

    it('throws when auth tag is tampered', () => {
      const ct = encryptToken('important')
      const [iv, tag, encrypted] = ct.split('.')
      const tamperedTag = tag.slice(0, -2) + (tag.endsWith('A') ? 'B' : 'A') + tag.slice(-1)
      expect(() => decryptToken(`${iv}.${tamperedTag}.${encrypted}`)).toThrow()
    })

    it('throws when a different key was used for encryption', () => {
      const ct = encryptToken('secret')
      // Switch the key
      process.env.TOKEN_ENCRYPTION_KEY = 'a-completely-different-key-with-enough-bytes'
      expect(() => decryptToken(ct)).toThrow()
    })

    it('throws when TOKEN_ENCRYPTION_KEY is missing', () => {
      const ct = encryptToken('hello')
      delete process.env.TOKEN_ENCRYPTION_KEY
      expect(() => decryptToken(ct)).toThrow(/TOKEN_ENCRYPTION_KEY/)
    })
  })
})
