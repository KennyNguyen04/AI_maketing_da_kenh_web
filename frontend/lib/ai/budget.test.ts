import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabaseAdmin before importing budget module
const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => {
      mockFrom(...args)
      return {
        insert: (...insertArgs: unknown[]) => {
          mockInsert(...insertArgs)
          return Promise.resolve({ data: null, error: null })
        },
      }
    },
  },
}))

// Import after mocking
import { checkAiBudget, consumeAiBudget, recordAiGeneration } from './budget'

describe('lib/ai/budget: checkAiBudget', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockFrom.mockReset()
    mockInsert.mockReset()
  })

  it('returns allowed: true when budget available', async () => {
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 42, reset_at: '2026-07-01T00:00:00Z' }],
      error: null,
    })

    const result = await checkAiBudget('user-1')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(42)
    expect(result.resetAt).toBeTypeOf('number')
    expect(result.resetAt).toBe(new Date('2026-07-01T00:00:00Z').getTime())
  })

  it('returns allowed: false when budget exhausted', async () => {
    mockRpc.mockResolvedValue({
      data: [{ allowed: false, remaining: 0, reset_at: '2026-07-01T00:00:00Z' }],
      error: null,
    })

    const result = await checkAiBudget('user-1')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('calls correct RPC function (check_ai_budget, not consume)', async () => {
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 50, reset_at: '2026-07-01T00:00:00Z' }],
      error: null,
    })

    await checkAiBudget('user-1')
    expect(mockRpc).toHaveBeenCalledWith('check_ai_budget', expect.objectContaining({ p_user_id: 'user-1' }))
  })

  it('passes daily limit to RPC', async () => {
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 50, reset_at: '2026-07-01T00:00:00Z' }],
      error: null,
    })

    await checkAiBudget('user-1')
    expect(mockRpc).toHaveBeenCalledWith('check_ai_budget', expect.objectContaining({ p_daily_limit: 50 }))
  })

  it('fail-closed: returns allowed: false on RPC error (safety)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'connection timeout' },
    })

    const result = await checkAiBudget('user-1')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    // resetAt should be ~24h from now
    const expectedReset = Date.now() + 24 * 60 * 60 * 1000
    expect(result.resetAt).toBeGreaterThan(expectedReset - 5000)
    expect(result.resetAt).toBeLessThan(expectedReset + 5000)
  })

  it('fail-closed: returns allowed: false on empty data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const result = await checkAiBudget('user-1')
    expect(result.allowed).toBe(false)
  })

  it('fail-closed: returns allowed: false on null data', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await checkAiBudget('user-1')
    expect(result.allowed).toBe(false)
  })
})

describe('lib/ai/budget: consumeAiBudget', () => {
  beforeEach(() => {
    mockRpc.mockReset()
  })

  it('decrements budget and returns new remaining', async () => {
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 49, reset_at: '2026-07-01T00:00:00Z' }],
      error: null,
    })

    const result = await consumeAiBudget('user-1')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(49)
  })

  it('calls consume_ai_budget RPC (not check_ai_budget)', async () => {
    mockRpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 49, reset_at: '2026-07-01T00:00:00Z' }],
      error: null,
    })

    await consumeAiBudget('user-1')
    expect(mockRpc).toHaveBeenCalledWith('consume_ai_budget', expect.any(Object))
  })

  it('returns allowed: false when limit reached during consume', async () => {
    mockRpc.mockResolvedValue({
      data: [{ allowed: false, remaining: 0, reset_at: '2026-07-01T00:00:00Z' }],
      error: null,
    })

    const result = await consumeAiBudget('user-1')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('fail-closed on consume RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } })

    const result = await consumeAiBudget('user-1')
    expect(result.allowed).toBe(false)
  })
})

describe('lib/ai/budget: recordAiGeneration', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockInsert.mockReset()
  })

  it('inserts record into ai_generations table', async () => {
    await recordAiGeneration('user-1', 'facebook', true, 250)
    expect(mockFrom).toHaveBeenCalledWith('ai_generations')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        channel: 'facebook',
        success: true,
        tokens_used: 250,
      })
    )
  })

  it('handles missing tokens_used gracefully (defaults to null)', async () => {
    await recordAiGeneration('user-1', 'x', true)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ tokens_used: null })
    )
  })

  it('records failed generation', async () => {
    await recordAiGeneration('user-1', 'x', false, 100)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, tokens_used: 100 })
    )
  })

  it('does NOT throw on insert failure (fire-and-forget)', async () => {
    mockInsert.mockRejectedValue(new Error('insert failed'))

    // Should not throw — best-effort logging
    await expect(recordAiGeneration('user-1', 'x', true)).resolves.toBeUndefined()
  })

  it('includes created_at timestamp', async () => {
    await recordAiGeneration('user-1', 'x', true, 100)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_at: expect.any(String),
      })
    )
    const call = mockInsert.mock.calls[0][0] as { created_at: string }
    expect(() => new Date(call.created_at)).not.toThrow()
  })
})