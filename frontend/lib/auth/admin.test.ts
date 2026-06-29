import { describe, it, expect, vi, beforeEach } from 'vitest'

// Module-level mock state
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

// Build a chainable mock that emulates Supabase query builder:
// .from(t).select(c).eq(k, v).single()
const mockChain = {
  select: (...a: unknown[]) => { mockSelect(...a); return mockChain },
  eq: (...a: unknown[]) => { mockEq(...a); return mockChain },
  single: () => mockSingle(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: (...a: unknown[]) => mockGetUser(...a),
    },
    from: (...a: unknown[]) => { mockFrom(...a); return mockChain },
  }),
}))

// Import AFTER mock setup
import { getCurrentUserProfile, requireAdmin } from './admin'

describe('lib/auth/admin: getCurrentUserProfile', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockSingle.mockReset()
  })

  it('returns supabase, null user, null profile when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await getCurrentUserProfile()
    expect(result.user).toBeNull()
    expect(result.profile).toBeNull()
    expect(result.supabase).toBeDefined()
  })

  it('fetches profile when user is authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      user_plan: 'pro',
      created_at: '2026-01-01T00:00:00Z',
    }

    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockSingle.mockResolvedValue({ data: mockProfile, error: null })

    const result = await getCurrentUserProfile()
    expect(result.user).toEqual(mockUser)
    expect(result.profile).toEqual(mockProfile)
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockEq).toHaveBeenCalledWith('id', 'user-123')
  })

  it('selects only safe profile fields (no secrets)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSingle.mockResolvedValue({ data: null, error: null })

    await getCurrentUserProfile()
    expect(mockSelect).toHaveBeenCalledWith('id, email, full_name, user_plan, created_at')
  })

  it('returns null profile if profile fetch fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const result = await getCurrentUserProfile()
    expect(result.user).not.toBeNull()
    expect(result.profile).toBeNull()
  })

  it('propagates auth errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'jwt expired' } })

    const result = await getCurrentUserProfile()
    expect(result.user).toBeNull()
  })

  it('always returns a supabase client instance', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const result = await getCurrentUserProfile()
    expect(typeof result.supabase).toBe('object')
    expect(result.supabase).not.toBeNull()
  })
})

describe('lib/auth/admin: requireAdmin (success path)', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockSingle.mockReset()
  })

  it('returns error: null when user is admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'admin@example.com' } },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'admin-1', user_plan: 'admin', email: 'admin@example.com' },
      error: null,
    })

    const result = await requireAdmin()
    expect(result.error).toBeNull()
    expect(result.user).not.toBeNull()
    expect(result.profile?.user_plan).toBe('admin')
  })
})

describe('lib/auth/admin: requireAdmin (401 Unauthorized)', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockSingle.mockReset()
  })

  it('returns 401 when no user (not authenticated)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await requireAdmin()
    expect(result.user).toBeNull()
    expect(result.profile).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error!.status).toBe(401)
  })

  it('401 response has correct JSON body', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await requireAdmin()
    const body = await result.error!.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('does not check profile when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await requireAdmin()
    // Profile fetch should be skipped (no .from() call)
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('lib/auth/admin: requireAdmin (403 Forbidden)', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockSingle.mockReset()
  })

  it('returns 403 when user is authenticated but not admin', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', user_plan: 'pro', email: 'user@example.com' },
      error: null,
    })

    const result = await requireAdmin()
    expect(result.user).not.toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error!.status).toBe(403)
  })

  it('403 response has correct JSON body', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'user-1', user_plan: 'free' },
      error: null,
    })

    const result = await requireAdmin()
    const body = await result.error!.json()
    expect(body).toEqual({ error: 'Forbidden' })
  })

  it('returns 403 when profile is null (user exists but no profile)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSingle.mockResolvedValue({ data: null, error: null })

    const result = await requireAdmin()
    expect(result.user).not.toBeNull()
    expect(result.profile).toBeNull()
    expect(result.error!.status).toBe(403)
  })

  it('returns 403 for every non-admin user_plan', async () => {
    const plans = ['free', 'pro', 'starter', 'enterprise', '', null]

    for (const plan of plans) {
      mockGetUser.mockReset()
      mockSingle.mockReset()
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      })
      mockSingle.mockResolvedValue({
        data: { id: 'u1', user_plan: plan },
        error: null,
      })

      const result = await requireAdmin()
      expect(result.error!.status, `plan=${plan} should be 403`).toBe(403)
    }
  })

  it('allows only user_plan === "admin" (strict equality)', async () => {
    // Verify case sensitivity
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'u1', user_plan: 'Admin' }, // capital A
      error: null,
    })

    const result = await requireAdmin()
    expect(result.error!.status).toBe(403) // 'Admin' !== 'admin'
  })
})

describe('lib/auth/admin: requireAdmin (success consistency)', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockSingle.mockReset()
  })

  it('success path returns all expected fields', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'admin-1', user_plan: 'admin' },
      error: null,
    })

    const result = await requireAdmin()
    expect(result).toHaveProperty('supabase')
    expect(result).toHaveProperty('user')
    expect(result).toHaveProperty('profile')
    expect(result).toHaveProperty('error')
    expect(result.error).toBeNull()
  })

  it('does not leak error response when admin check passes', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'admin-1', user_plan: 'admin' },
      error: null,
    })

    const result = await requireAdmin()
    expect(result.error).toBeNull()
    expect(result.user).not.toBeNull()
    expect(result.profile?.user_plan).toBe('admin')
  })

  it('explicit admin check by plan string', async () => {
    // Verify the exact comparison logic
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    mockSingle.mockResolvedValue({
      data: { id: 'u1', user_plan: 'admin' },
      error: null,
    })

    const result = await requireAdmin()
    // The check is `profile?.user_plan !== 'admin'`
    // If user_plan is exactly 'admin', result.error is null
    expect(result.error).toBeNull()
    expect(result.profile?.user_plan).toBe('admin')
  })
})