/**
 * Extension API Integration Tests — verify auth + validation + happy/error path
 * for critical extension endpoints.
 *
 * Các route đã cover:
 *   - GET  /api/extension/tasks      (poll next task)
 *   - POST /api/extension/cancel     (cancel pending task)
 *   - POST /api/extension/resync     (recover stale processing tasks)
 *   - GET  /api/extension/targets    (list social targets)
 *   - POST /api/extension/targets    (create social target)
 *
 * Pattern:
 *   - Mock @/lib/supabase/admin trả chainable query builder.
 *   - Mock ../_auth.verifyToken để inject user_id directly.
 *   - Mỗi test gọi import POST/GET handler với Request giả lập.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockQueryBuilder, dbOk, dbError } from '../setup/supabase-mock'
import { createMockUser, createMockExtensionTask, createMockSocialAccount } from '../setup/factories'

// ─── Mock modules BEFORE importing routes ───────────────────────────

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'
const mockVerifyToken = vi.fn()

vi.mock('../../app/api/extension/_auth', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}))

// Helper: build a Supabase admin client mock with chainable query builder
// mapping for the routes we exercise.
function setupSupabaseAdminMock(responses: Record<string, { data: unknown; error: unknown } | unknown[]> = {}) {
  const builders: Record<string, ReturnType<typeof createMockQueryBuilder>> = {}

  function getBuilder(table: string) {
    if (!builders[table]) {
      const r = responses[table]
      // Normalize raw data into MockQueryResult shape
      const normalized = r !== undefined
        ? (Array.isArray(r) || (typeof r === 'object' && r !== null && 'data' in r)
            ? r as ReturnType<typeof dbOk>
            : dbOk(r))
        : dbOk([])
      builders[table] = createMockQueryBuilder(normalized)
    }
    return builders[table]
  }

  return {
    from: vi.fn((table: string) => getBuilder(table)),
    rpc: vi.fn().mockResolvedValue(dbOk(null)),
    builders,
  }
}

let adminMock: ReturnType<typeof setupSupabaseAdminMock>

vi.mock('@/lib/supabase/admin', () => ({
  get supabaseAdmin() {
    return adminMock
  },
}))

// ─── Test helpers ───────────────────────────────────────────────────

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init)
}

function makeAuthRequest(url: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers)
  headers.set('Authorization', 'Bearer test-token-12345678')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return new Request(url, { ...init, headers })
}

// ─── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  mockVerifyToken.mockReset()
  // Default: chỉ trả userId khi header hợp lệ. Test case cần 401 sẽ
  // override bằng mockResolvedValueOnce(null) hoặc mockImplementation riêng.
  mockVerifyToken.mockImplementation(async (authHeader: string | null) => {
    if (!authHeader?.startsWith('Bearer ')) return null
    if (authHeader === 'Bearer invalid-token-12345678') return null
    return MOCK_USER_ID
  })
  adminMock = setupSupabaseAdminMock()
})

// ─── Tests: Auth guard ──────────────────────────────────────────────

describe('extension API: auth guard', () => {
  it('returns 401 when Authorization header missing', async () => {
    const { GET } = await import('@/app/api/extension/tasks/route')
    const res = await GET(makeRequest('http://x/api/extension/tasks'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/invalid token/i)
  })

  it('returns 401 when Authorization header is malformed', async () => {
    const { GET } = await import('@/app/api/extension/tasks/route')
    const req = new Request('http://x/api/extension/tasks', {
      headers: { Authorization: 'Basic foo' }, // not Bearer
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when token does not match any api_keys row', async () => {
    const { GET } = await import('@/app/api/extension/tasks/route')
    const req = new Request('http://x/api/extension/tasks', {
      headers: { Authorization: 'Bearer invalid-token-12345678' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})

// ─── Tests: GET /api/extension/tasks ─────────────────────────────────

describe('extension API: GET /api/extension/tasks', () => {
  it('returns empty array when no pending tasks', async () => {
    const { GET } = await import('@/app/api/extension/tasks/route')
    const res = await GET(makeAuthRequest('http://x/api/extension/tasks'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks).toEqual([])
  })

  it('returns task when one pending', async () => {
    const user = createMockUser({ id: MOCK_USER_ID })
    const task = createMockExtensionTask({ user_id: user.id, channel: 'facebook' })
    adminMock = setupSupabaseAdminMock({})

    // Override: candidates query returns one task; second query (dayCount) returns 0; third (lastTask) returns null
    const candidatesBuilder = createMockQueryBuilder(dbOk([task]))
    const dayCountBuilder = createMockQueryBuilder(dbOk([]))
    const lastTaskBuilder = createMockQueryBuilder(dbOk(null))

    let callIdx = 0
    adminMock.from = vi.fn(() => {
      callIdx += 1
      if (callIdx === 1) return candidatesBuilder
      if (callIdx === 2) return dayCountBuilder
      return lastTaskBuilder
    })

    const { GET } = await import('@/app/api/extension/tasks/route')
    const res = await GET(makeAuthRequest('http://x/api/extension/tasks'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tasks).toHaveLength(1)
    expect(body.tasks[0].channel).toBe('facebook')
  })
})

// ─── Tests: POST /api/extension/cancel ───────────────────────────────

describe('extension API: POST /api/extension/cancel', () => {
  it('returns 400 when task_id is missing', async () => {
    const { POST } = await import('@/app/api/extension/cancel/route')
    const res = await POST(makeAuthRequest('http://x/api/extension/cancel', {
      method: 'POST',
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })

  it('returns 200 and cancels the task', async () => {
    const updateBuilder = createMockQueryBuilder(dbOk([{ id: 'task-1' }]))
    adminMock.from = vi.fn(() => updateBuilder)

    const { POST } = await import('@/app/api/extension/cancel/route')
    const res = await POST(makeAuthRequest('http://x/api/extension/cancel', {
      method: 'POST',
      body: JSON.stringify({ task_id: 'task-1', reason: 'User cancelled' }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.task_id).toBe('task-1')
  })

  it('returns 404 when task not found or already finalized', async () => {
    const updateBuilder = createMockQueryBuilder(dbOk([]))
    adminMock.from = vi.fn(() => updateBuilder)

    const { POST } = await import('@/app/api/extension/cancel/route')
    const res = await POST(makeAuthRequest('http://x/api/extension/cancel', {
      method: 'POST',
      body: JSON.stringify({ task_id: 'task-doesnt-exist' }),
    }))
    expect(res.status).toBe(404)
  })
})

// ─── Tests: POST /api/extension/resync (P0 regression) ──────────────

describe('extension API: POST /api/extension/resync', () => {
  it('resets stale processing tasks back to pending', async () => {
    const resetBuilder = createMockQueryBuilder(dbOk([
      { id: 'stale-1' },
      { id: 'stale-2' },
    ]))
    const candidatesBuilder = createMockQueryBuilder(dbOk([]))

    let callIdx = 0
    adminMock.from = vi.fn(() => {
      callIdx += 1
      return callIdx === 1 ? resetBuilder : candidatesBuilder
    })

    const { POST } = await import('@/app/api/extension/resync/route')
    const res = await POST(makeAuthRequest('http://x/api/extension/resync', {
      method: 'POST',
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.reset_count).toBe(2)
    expect(body.tasks).toEqual([])
  })

  it('returns reset_count=0 when no stale tasks', async () => {
    const resetBuilder = createMockQueryBuilder(dbOk([]))
    const candidatesBuilder = createMockQueryBuilder(dbOk([]))

    let callIdx = 0
    adminMock.from = vi.fn(() => {
      callIdx += 1
      return callIdx === 1 ? resetBuilder : candidatesBuilder
    })

    const { POST } = await import('@/app/api/extension/resync/route')
    const res = await POST(makeAuthRequest('http://x/api/extension/resync', {
      method: 'POST',
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.reset_count).toBe(0)
  })

  it('returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/extension/resync/route')
    const res = await POST(makeRequest('http://x/api/extension/resync', { method: 'POST' }))
    expect(res.status).toBe(401)
  })
})

// ─── Tests: GET /api/extension/targets ──────────────────────────────

describe('extension API: GET /api/extension/targets', () => {
  it('returns array of active targets', async () => {
    const builder = createMockQueryBuilder(dbOk([
      { id: 't1', channel: 'facebook-group', target_id: 'g1', name: 'Group 1' },
    ]))
    adminMock.from = vi.fn(() => builder)

    const { GET } = await import('@/app/api/extension/targets/route')
    const res = await GET(makeAuthRequest('http://x/api/extension/targets'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.targets).toHaveLength(1)
  })

  it('returns empty array when no targets', async () => {
    const builder = createMockQueryBuilder(dbOk([]))
    adminMock.from = vi.fn(() => builder)

    const { GET } = await import('@/app/api/extension/targets/route')
    const res = await GET(makeAuthRequest('http://x/api/extension/targets'))
    const body = await res.json()
    expect(body.targets).toEqual([])
  })
})

// ─── Tests: POST /api/extension/targets (P0-5 regression) ───────────

describe('extension API: POST /api/extension/targets', () => {
  it('returns 400 when missing required fields', async () => {
    const { POST } = await import('@/app/api/extension/targets/route')
    const res = await POST(makeAuthRequest('http://x/api/extension/targets', {
      method: 'POST',
      body: JSON.stringify({ channel: 'facebook-group' }), // missing targetId, name
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/missing required/i)
  })

  it('returns 400 for invalid channel', async () => {
    const { POST } = await import('@/app/api/extension/targets/route')
    const res = await POST(makeAuthRequest('http://x/api/extension/targets', {
      method: 'POST',
      body: JSON.stringify({
        channel: 'myspace',
        targetId: 't1',
        name: 'Test',
      }),
    }))
    expect(res.status).toBe(400)
  })

  it('creates target on valid input', async () => {
    const newTarget = { id: 'new-1', channel: 'facebook-group', target_id: 'g1', name: 'My Group' }
    const insertBuilder = createMockQueryBuilder(dbOk(newTarget))
    adminMock.from = vi.fn(() => insertBuilder)

    const { POST } = await import('@/app/api/extension/targets/route')
    const res = await POST(makeAuthRequest('http://x/api/extension/targets', {
      method: 'POST',
      body: JSON.stringify({
        channel: 'facebook-group',
        targetId: 'g1',
        targetType: 'group',
        name: 'My Group',
        url: 'https://facebook.com/groups/g1',
        autoPost: true,
      }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.target.id).toBe('new-1')
  })

  it('returns 500 when DB insert fails', async () => {
    const insertBuilder = createMockQueryBuilder(dbError('insert failed'))
    adminMock.from = vi.fn(() => insertBuilder)

    const { POST } = await import('@/app/api/extension/targets/route')
    const res = await POST(makeAuthRequest('http://x/api/extension/targets', {
      method: 'POST',
      body: JSON.stringify({
        channel: 'facebook-group',
        targetId: 'g1',
        name: 'My Group',
      }),
    }))
    expect(res.status).toBe(500)
  })
})

// ─── Tests: IDOR protection (cross-user data) ───────────────────────

describe('extension API: IDOR protection', () => {
  it('cancel route filters by user_id from verified token', async () => {
    // verifyToken trả về userId của user hiện tại. Route handler phải
    // include .eq('user_id', userId) trong query để user khác không cancel
    // được task của user này.
    const updateBuilder = createMockQueryBuilder(dbOk([{ id: 'task-1' }]))
    adminMock.from = vi.fn(() => updateBuilder)

    const { POST } = await import('@/app/api/extension/cancel/route')
    await POST(makeAuthRequest('http://x/api/extension/cancel', {
      method: 'POST',
      body: JSON.stringify({ task_id: 'task-1' }),
    }))

    // Verify the chain included .eq('user_id', MOCK_USER_ID)
    expect(updateBuilder.eq).toHaveBeenCalledWith('user_id', MOCK_USER_ID)
  })

  it('resync route filters by user_id', async () => {
    const resetBuilder = createMockQueryBuilder(dbOk([]))
    const candidatesBuilder = createMockQueryBuilder(dbOk([]))
    let callIdx = 0
    adminMock.from = vi.fn(() => {
      callIdx += 1
      return callIdx === 1 ? resetBuilder : candidatesBuilder
    })

    const { POST } = await import('@/app/api/extension/resync/route')
    await POST(makeAuthRequest('http://x/api/extension/resync', { method: 'POST' }))

    expect(resetBuilder.eq).toHaveBeenCalledWith('user_id', MOCK_USER_ID)
  })
})
