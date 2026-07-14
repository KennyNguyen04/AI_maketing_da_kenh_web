import { vi, beforeEach, afterEach } from 'vitest'
import type { Mock } from 'vitest'

/**
 * Fetch Mock — global fetch mock cho API route tests.
 *
 * Cú pháp:
 *
 *   mockFetch({
 *     'POST /api/extension/tasks': { status: 200, body: { ok: true } },
 *     'GET /api/extension/status': { status: 200, body: { pending: 3 } },
 *   })
 *
 *   // Trong test
 *   await fetch('/api/extension/tasks', { method: 'POST', body: JSON.stringify({...}) })
 *   expect(global.fetch).toHaveBeenCalledWith('/api/extension/tasks', expect.objectContaining({...}))
 *
 * Hỗ trợ:
 *  - JSON body tự động serialize
 *  - Status code tùy ý
 *  - Headers tùy chỉnh (vd: Authorization)
 *  - Multiple responses cho cùng endpoint (trả về theo thứ tự gọi)
 *  - Default fallback cho unmatched routes (404)
 */

export interface MockFetchResponse {
  status?: number
  body?: unknown
  headers?: Record<string, string>
  delay?: number
}

export type MockFetchRoute = `${string} ${string}` | string

interface RouteMatcher {
  method: string
  path: string
  response: MockFetchResponse
  callCount: number
}

function parseRoute(key: string): { method: string; path: string } {
  // 'GET /api/foo' → { method: 'GET', path: '/api/foo' }
  const parts = key.split(' ')
  if (parts.length === 2) {
    return { method: parts[0].toUpperCase(), path: parts[1] }
  }
  return { method: '*', path: key }
}

function matchPath(pattern: string, actual: string): boolean {
  if (pattern === actual) return true
  // Support trailing wildcard: '/api/*' matches '/api/foo/bar'
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    return actual.startsWith(prefix)
  }
  return false
}

let mockFetchFn: Mock | null = null
let routeMatchers: RouteMatcher[] = []

/**
 * Cài đặt global fetch mock. Gọi trước `describe` hoặc trong `beforeEach`.
 * Tự động setup/teardown lifecycle nếu gọi ở top-level của test file.
 */
export function mockFetch(routes: Record<string, MockFetchResponse | MockFetchResponse[]> = {}): Mock {
  routeMatchers = []
  for (const [key, response] of Object.entries(routes)) {
    const { method, path } = parseRoute(key)
    const responses = Array.isArray(response) ? response : [response]
    for (const r of responses) {
      routeMatchers.push({ method, path, response: r, callCount: 0 })
    }
  }

  mockFetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url
    const method = (init?.method ?? 'GET').toUpperCase()

    // Tìm matcher đầu tiên khớp cả method và path
    const candidates = routeMatchers.filter(m =>
      (m.method === '*' || m.method === method) && matchPath(m.path, url),
    )

    if (candidates.length === 0) {
      // Default 404 khi không match
      return new Response(JSON.stringify({ error: 'Not Found (mock)' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Trong cùng method+path, lấy entry có callCount thấp nhất (round-robin)
    candidates.sort((a, b) => a.callCount - b.callCount)
    const matcher = candidates[0]
    matcher.callCount += 1

    const { status = 200, body = null, headers = {}, delay = 0 } = matcher.response
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    const responseHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers }
    const responseBody = body !== null && body !== undefined
      ? (typeof body === 'string' ? body : JSON.stringify(body))
      : ''

    return new Response(responseBody, {
      status,
      headers: responseHeaders,
    })
  })

  global.fetch = mockFetchFn as unknown as typeof fetch
  return mockFetchFn
}

/**
 * Restore global fetch về giá trị ban đầu.
 */
export function restoreFetch(): void {
  if (mockFetchFn) {
    mockFetchFn.mockReset()
    mockFetchFn = null
  }
  routeMatchers = []
}

/**
 * Auto-cleanup: tự động restore sau mỗi test.
 */
export function setupFetchMock(): void {
  beforeEach(() => {
    routeMatchers = []
    mockFetchFn = null
  })
  afterEach(() => {
    restoreFetch()
  })
}

/**
 * Get current mock function (for assertions like toHaveBeenCalledWith).
 */
export function getMockFetch(): Mock | null {
  return mockFetchFn
}

/**
 * Helper: build a Response with JSON body.
 */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Helper: build a Response that mimics NextResponse.json (so route code that
 * calls .json() works). Equivalent to jsonResponse above, but exported as
 * a separate name to make test intent explicit at call sites.
 */
export const mockJsonResponse = jsonResponse

/**
 * Helper: assert fetch was called with specific URL and method.
 */
export function expectFetchCalledWith(
  mock: Mock,
  url: string | RegExp,
  init?: { method?: string; body?: unknown },
): void {
  const calls = mock.mock.calls as Array<[RequestInfo | URL, RequestInit | undefined]>
  const found = calls.some(([arg, argInit]) => {
    const actualUrl = typeof arg === 'string'
      ? arg
      : arg instanceof URL
        ? arg.toString()
        : arg.url
    const urlMatches = typeof url === 'string'
      ? actualUrl === url
      : url.test(actualUrl)
    const methodMatches = !init?.method || (argInit?.method ?? 'GET').toUpperCase() === init.method.toUpperCase()
    const bodyMatches = !init?.body
      || JSON.stringify(argInit?.body) === JSON.stringify(init.body)
    return urlMatches && methodMatches && bodyMatches
  })
  if (!found) {
    throw new Error(
      `Expected fetch to be called with ${url} ${init?.method ?? ''}, but calls were: ${JSON.stringify(calls)}`,
    )
  }
}
