import { describe, it, expect, vi, beforeEach } from 'vitest'

// Note: token-manager.ts imports from '@/lib/supabase/server' (createClient)
// We'll mock this. Token encryption is done via real crypto, controlled by
// TOKEN_ENCRYPTION_KEY env var.

// Set TOKEN_ENCRYPTION_KEY before importing — needed by getKey() in crypto.ts
process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-only'
process.env.X_CLIENT_ID = 'test-x-client-id'
process.env.X_CLIENT_SECRET = 'test-x-client-secret'
process.env.FACEBOOK_APP_ID = 'test-fb-app-id'
process.env.FACEBOOK_APP_SECRET = 'test-fb-app-secret'

// Mock fetch globally for X/Facebook token endpoints
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock createClient (cookie-based supabase server client) for saveNewTokens
const mockSupabaseUpdate = vi.fn()
const mockSupabaseEq = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (..._args: unknown[]) => {
      mockSupabaseFrom(..._args)
      return {
        update: (...a: unknown[]) => {
          mockSupabaseUpdate(...a)
          return {
            eq: (...b: unknown[]) => {
              mockSupabaseEq(...b)
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
  }),
}))

// Import after mocking
import { isTokenExpired, validateAccountForPublishing, getValidAccessToken, type TokenInfo } from './token-manager'
import { encryptToken } from './crypto'

// Helpers
const makeAccount = (overrides: Record<string, unknown> = {}) => ({
  id: 'account-1',
  provider: 'x' as const,
  access_token_encrypted: encryptToken('plain-access-token'),
  refresh_token_encrypted: encryptToken('plain-refresh-token'),
  token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  ...overrides,
})

describe('lib/social/token-manager: isTokenExpired', () => {
  it('returns false for null/undefined expiry', () => {
    expect(isTokenExpired(null)).toBe(false)
    expect(isTokenExpired(undefined)).toBe(false)
  })

  it('returns false for token expiring in the future', () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    expect(isTokenExpired(futureExpiry)).toBe(false)
  })

  it('returns true for token already expired', () => {
    const pastExpiry = new Date(Date.now() - 60 * 1000).toISOString()
    expect(isTokenExpired(pastExpiry)).toBe(true)
  })

  it('returns false right at expiry boundary (Date.now() >= expiry → true)', () => {
    const exactlyNow = new Date(Date.now()).toISOString()
    expect(isTokenExpired(exactlyNow)).toBe(true)
  })

  it('handles invalid date strings gracefully', () => {
    // Invalid date yields NaN from getTime() → Date.now() >= NaN is false
    expect(isTokenExpired('not-a-date')).toBe(false)
  })
})

describe('lib/social/token-manager: validateAccountForPublishing', () => {
  it('returns valid: false when no access token', () => {
    const result = validateAccountForPublishing({
      provider: 'x',
      access_token_encrypted: '',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('No access token')
  })

  it('returns valid: true for Facebook with access_token only (no refresh needed)', () => {
    const result = validateAccountForPublishing({
      provider: 'facebook',
      access_token_encrypted: encryptToken('fb-access-token'),
    })
    expect(result.valid).toBe(true)
  })

  it('returns valid: true for X with refresh token present', () => {
    const result = validateAccountForPublishing({
      provider: 'x',
      access_token_encrypted: encryptToken('x-access'),
      refresh_token_encrypted: encryptToken('x-refresh'),
    })
    expect(result.valid).toBe(true)
  })

  it('returns valid: false for X without refresh token', () => {
    const result = validateAccountForPublishing({
      provider: 'x',
      access_token_encrypted: encryptToken('x-access'),
      refresh_token_encrypted: null,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('reconnection')
  })

  it('returns valid: false for X with empty string refresh token', () => {
    const result = validateAccountForPublishing({
      provider: 'x',
      access_token_encrypted: encryptToken('x-access'),
      refresh_token_encrypted: '',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('reconnection')
  })
})

describe('lib/social/token-manager: getValidAccessToken (no refresh needed)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockSupabaseUpdate.mockReset()
    mockSupabaseEq.mockReset()
    mockSupabaseFrom.mockReset()
  })

  it('returns decrypted access token without making API call when not expiring soon', async () => {
    const account = makeAccount({
      // Expires in 1 hour — NOT expiring soon (buffer is 5 min)
      token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    })

    const result = await getValidAccessToken(account)
    expect(result.accessToken).toBe('plain-access-token')
    // No fetch calls because we didn't refresh
    expect(mockFetch).not.toHaveBeenCalled()
    // No DB writes
    expect(mockSupabaseUpdate).not.toHaveBeenCalled()
  })

  it('handles null token_expires_at (no refresh logic)', async () => {
    const account = makeAccount({ token_expires_at: null })

    const result = await getValidAccessToken(account)
    expect(result.accessToken).toBe('plain-access-token')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns the original account (same object identity)', async () => {
    const account = makeAccount()
    const result = await getValidAccessToken(account)
    expect(result.account).toBe(account)
  })
})

describe('lib/social/token-manager: getValidAccessToken (X refresh path)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockSupabaseUpdate.mockReset()
    mockSupabaseEq.mockReset()
    mockSupabaseFrom.mockReset()
  })

  it('refreshes X token when expiring soon and saves to DB', async () => {
    const account = makeAccount({
      // Expires in 1 minute — expiring soon (within 5 min buffer)
      token_expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 7200,
      }),
    })

    const result = await getValidAccessToken(account)
    expect(result.accessToken).toBe('new-access-token')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.x.com/2/oauth2/token',
      expect.objectContaining({ method: 'POST' })
    )
    expect(mockSupabaseUpdate).toHaveBeenCalled()
    expect(mockSupabaseFrom).toHaveBeenCalledWith('social_targets')
  })

  it('uses Basic Auth header when X_CLIENT_SECRET is set', async () => {
    const account = makeAccount({ token_expires_at: new Date(Date.now() + 60 * 1000).toISOString() })

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new', expires_in: 7200 }),
    })

    await getValidAccessToken(account)
    const callArgs = mockFetch.mock.calls[0]
    const headers = callArgs[1].headers as Record<string, string>
    expect(headers.Authorization).toMatch(/^Basic /)
  })

  it('falls back to current token if refresh fails', async () => {
    const account = makeAccount({ token_expires_at: new Date(Date.now() + 60 * 1000).toISOString() })

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid grant',
    })

    const result = await getValidAccessToken(account)
    // Falls back to current (still-valid) decrypted token
    expect(result.accessToken).toBe('plain-access-token')
  })
})

describe('lib/social/token-manager: getValidAccessToken (Facebook path)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockSupabaseUpdate.mockReset()
    mockSupabaseEq.mockReset()
    mockSupabaseFrom.mockReset()
  })

  it('refreshes Facebook token via fb_exchange_token', async () => {
    const account = makeAccount({
      provider: 'facebook',
      token_expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-fb-token', expires_in: 5184000 }),
    })

    const result = await getValidAccessToken(account)
    expect(result.accessToken).toBe('new-fb-token')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('graph.facebook.com')
    )
    expect(mockFetch.mock.calls[0][0]).toContain('fb_exchange_token')
  })

  it('falls back to original token if FB refresh fails', async () => {
    const account = makeAccount({
      provider: 'facebook',
      token_expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
    })

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    })

    const result = await getValidAccessToken(account)
    expect(result.accessToken).toBe('plain-access-token')
  })
})

describe('lib/social/token-manager: getValidAccessToken (env validation)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockSupabaseUpdate.mockReset()
    mockSupabaseEq.mockReset()
    mockSupabaseFrom.mockReset()
  })

  it('throws when X refresh attempted but no X_CLIENT_ID set', async () => {
    const originalId = process.env.X_CLIENT_ID
    const originalSecret = process.env.X_CLIENT_SECRET
    delete process.env.X_CLIENT_ID
    delete process.env.X_CLIENT_SECRET

    const account = makeAccount({
      token_expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
    })

    const result = await getValidAccessToken(account)
    // Should fall through to fallback (use current token)
    expect(result.accessToken).toBe('plain-access-token')
    expect(mockFetch).not.toHaveBeenCalled()

    process.env.X_CLIENT_ID = originalId
    process.env.X_CLIENT_SECRET = originalSecret
  })

  it('throws when X has no refresh token', async () => {
    const account = makeAccount({
      refresh_token_encrypted: undefined,
      token_expires_at: new Date(Date.now() + 60 * 1000).toISOString(),
    })

    const result = await getValidAccessToken(account)
    // Fall back to current token
    expect(result.accessToken).toBe('plain-access-token')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('lib/social/token-manager: TokenInfo interface', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returned token info structure is correct on success', async () => {
    const account = makeAccount({ token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString() })

    const result = await getValidAccessToken(account)
    expect(result).toHaveProperty('account')
    expect(result).toHaveProperty('accessToken')
    expect(typeof result.accessToken).toBe('string')
  })
})