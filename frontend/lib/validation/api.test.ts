import { describe, it, expect } from 'vitest'
import {
  isUuid,
  normaliseChannel,
  validateChannels,
  validateSourceContent,
  validateDraftContent,
  validateSourceType,
  validateTitle,
  assertUuid,
  validationErrorResponse,
  VALID_CHANNELS,
  ApiValidationError,
} from './api'

describe('validation/api: VALID_CHANNELS canonical check', () => {
  it('contains x', () => {
    expect(VALID_CHANNELS).toContain('x')
  })

  it('does not contain twitter alias', () => {
    expect(VALID_CHANNELS).not.toContain('twitter')
  })

  it('contains all 5 canonical channels (2026-07-15: +threads)', () => {
    expect(VALID_CHANNELS).toHaveLength(5)
    expect(VALID_CHANNELS).toContain('linkedin_post')
    expect(VALID_CHANNELS).toContain('linkedin_thread')
    expect(VALID_CHANNELS).toContain('facebook')
    expect(VALID_CHANNELS).toContain('threads')
  })
})

describe('normaliseChannel', () => {
  it("normalises 'twitter' to 'x'", () => {
    expect(normaliseChannel('twitter')).toBe('x')
  })

  it("normalises 'Twitter' to 'x' (case-insensitive)", () => {
    expect(normaliseChannel('Twitter')).toBe('x')
  })

  it("normalises 'X' to 'x' (lowercase)", () => {
    expect(normaliseChannel('X')).toBe('x')
  })

  it("normalises 'linkedin_post' directly", () => {
    expect(normaliseChannel('linkedin_post')).toBe('linkedin_post')
  })

  it('returns null for unknown channel', () => {
    expect(normaliseChannel('invalid')).toBeNull()
    expect(normaliseChannel('tiktok')).toBeNull()
  })

  it('returns null for non-string input', () => {
    expect(normaliseChannel(123)).toBeNull()
    expect(normaliseChannel(null)).toBeNull()
    expect(normaliseChannel(undefined)).toBeNull()
    expect(normaliseChannel({})).toBeNull()
  })

  it('trims whitespace before normalising', () => {
    expect(normaliseChannel('  x  ')).toBe('x')
  })
})

describe('validateChannels', () => {
  it('returns canonical channels as-is', () => {
    expect(validateChannels(['x', 'facebook'])).toEqual(['x', 'facebook'])
    expect(validateChannels(['linkedin_post'])).toEqual(['linkedin_post'])
  })

  it("upgrades 'twitter' to 'x' silently", () => {
    expect(validateChannels(['twitter'])).toEqual(['x'])
  })

  it('throws on duplicate canonical channel (e.g. x + twitter)', () => {
    expect(() => validateChannels(['x', 'twitter'])).toThrow(ApiValidationError)
    expect(() => validateChannels(['x', 'twitter'])).toThrow(/duplicate/i)
  })

  it('throws on duplicate case variants', () => {
    expect(() => validateChannels(['X', 'x'])).toThrow(ApiValidationError)
  })

  it('throws on empty array', () => {
    expect(() => validateChannels([])).toThrow(ApiValidationError)
  })

  it('throws on non-array input', () => {
    expect(() => validateChannels('not-an-array')).toThrow(ApiValidationError)
    expect(() => validateChannels(null as unknown)).toThrow(ApiValidationError)
    expect(() => validateChannels({})).toThrow(ApiValidationError)
  })

  it('throws on unknown channel', () => {
    expect(() => validateChannels(['tiktok'])).toThrow(/tiktok.*invalid/i)
  })

  it('accepts all 5 canonical channels together', () => {
    expect(validateChannels(['x', 'facebook', 'linkedin_post', 'linkedin_thread', 'threads'])).toHaveLength(5)
  })
})

describe('isUuid', () => {
  it('returns true for valid v4 UUID', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('returns true for uppercase UUID', () => {
    expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })

  it('returns false for hex-only string', () => {
    expect(isUuid('abcdef123456')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isUuid('')).toBe(false)
  })

  it('returns false for null/undefined', () => {
    expect(isUuid(null)).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })

  it('returns false for wrong format (missing dashes)', () => {
    expect(isUuid('550e8400e29b41d4a716446655440000')).toBe(false)
  })
})

describe('validateSourceContent', () => {
  describe('type=url', () => {
    it('accepts https:// URL', () => {
      expect(validateSourceContent('https://example.com/article', 'url')).toBe(
        'https://example.com/article',
      )
    })

    it('accepts http:// URL', () => {
      expect(validateSourceContent('http://example.com', 'url')).toBe('http://example.com')
    })

    it('throws on non-http(s) URL', () => {
      expect(() => validateSourceContent('ftp://example.com', 'url')).toThrow(ApiValidationError)
      expect(() => validateSourceContent('file:///etc/passwd', 'url')).toThrow(ApiValidationError)
    })

    it('throws on malformed URL', () => {
      expect(() => validateSourceContent('not-a-url', 'url')).toThrow(ApiValidationError)
      expect(() => validateSourceContent('ht!tp://bad', 'url')).toThrow(ApiValidationError)
    })
  })

  describe('type=text', () => {
    it('accepts text >= 50 characters', () => {
      const text = 'A'.repeat(50)
      expect(validateSourceContent(text, 'text')).toBe(text)
    })

    it('accepts text >= 50 chars even with whitespace padding', () => {
      const text = '   ' + 'A'.repeat(50) + '   '
      expect(validateSourceContent(text, 'text')).toBe('A'.repeat(50))
    })

    it('throws when text < 50 characters', () => {
      expect(() => validateSourceContent('Too short', 'text')).toThrow(/at least 50 characters/i)
    })

    it('throws when text > 5000 words', () => {
      const manyWords = Array(5001).fill('word').join(' ')
      expect(() => validateSourceContent(manyWords, 'text')).toThrow(/5000 words or less/i)
    })

    it('throws on empty/whitespace-only string', () => {
      expect(() => validateSourceContent('', 'text')).toThrow(/required/i)
      expect(() => validateSourceContent('   ', 'text')).toThrow(/required/i)
    })
  })
})

describe('validateDraftContent', () => {
  it('accepts string up to 70000 chars', () => {
    const content = 'A'.repeat(70000)
    expect(validateDraftContent(content)).toBe(content)
  })

  it('throws when content > 70000 chars', () => {
    expect(() => validateDraftContent('A'.repeat(70001))).toThrow(/too long/i)
  })

  it('accepts empty string (no minimum constraint)', () => {
    expect(validateDraftContent('')).toBe('')
  })

  it('throws on non-string', () => {
    expect(() => validateDraftContent(123 as unknown)).toThrow(/must be a string/i)
  })
})

describe('assertUuid', () => {
  it('returns the value for a valid UUID', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(assertUuid(uuid, 'id')).toBe(uuid)
  })

  it('throws for invalid UUID with field name in message', () => {
    expect(() => assertUuid('bad', 'id')).toThrow(/id.*invalid/i)
  })

  it('throws for non-string input', () => {
    expect(() => assertUuid(123 as unknown, 'id')).toThrow(/id.*invalid/i)
  })
})

describe('validateSourceType', () => {
  it('returns "text" for undefined/null/empty', () => {
    expect(validateSourceType(undefined)).toBe('text')
    expect(validateSourceType(null)).toBe('text')
    expect(validateSourceType('')).toBe('text')
  })

  it('returns "text" for "text"', () => {
    expect(validateSourceType('text')).toBe('text')
  })

  it('returns "url" for "url"', () => {
    expect(validateSourceType('url')).toBe('url')
  })

  it('throws for "form"', () => {
    expect(() => validateSourceType('form')).toThrow(/text or url/i)
  })

  it('throws for unknown values', () => {
    expect(() => validateSourceType('xml' as unknown)).toThrow(/text or url/i)
  })
})

describe('validateTitle', () => {
  it('returns undefined for undefined/null/empty', () => {
    expect(validateTitle(undefined)).toBeUndefined()
    expect(validateTitle(null)).toBeUndefined()
    expect(validateTitle('')).toBeUndefined()
  })

  it('returns trimmed title for valid string', () => {
    expect(validateTitle('  My Title  ')).toBe('My Title')
  })

  it('returns undefined for empty after trim', () => {
    expect(validateTitle('   ')).toBeUndefined()
  })

  it('throws for non-string input', () => {
    expect(() => validateTitle(123 as unknown)).toThrow(/must be a string/i)
  })

  it('throws for title > 160 chars', () => {
    expect(() => validateTitle('A'.repeat(161))).toThrow(/160.*characters/i)
  })

  it('accepts title exactly 160 chars', () => {
    expect(validateTitle('A'.repeat(160))).toBe('A'.repeat(160))
  })
})

describe('validationErrorResponse', () => {
  it('returns JSON response for ApiValidationError', () => {
    const error = new ApiValidationError('Bad input', 422)
    const response = validationErrorResponse(error)
    expect(response).not.toBeNull()
    expect(response!.status).toBe(422)
  })

  it('returns null for non-ApiValidationError', () => {
    expect(validationErrorResponse(new Error('generic'))).toBeNull()
    expect(validationErrorResponse(null)).toBeNull()
    expect(validationErrorResponse(undefined)).toBeNull()
  })
})
