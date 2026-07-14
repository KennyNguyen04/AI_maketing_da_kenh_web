import { vi } from 'vitest'
import type { Mock } from 'vitest'

/**
 * Supabase Mock — tạo chainable query builder giả lập để route handlers
 * có thể chạy trong unit/integration test mà không cần DB thật.
 *
 * Cách dùng cơ bản:
 *
 *   const { client, queryBuilder } = createMockSupabaseClient({
 *     from: vi.fn().mockReturnValue(queryBuilder),
 *   })
 *   queryBuilder.single.mockResolvedValue({ data: user, error: null })
 *   vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: client }))
 *
 * Hoặc đơn giản hơn:
 *
 *   const { mockSupabaseAdmin, queryBuilder } = setupSupabaseMock({
 *     singleResult: { data: user, error: null },
 *     fromResult: { data: [user], error: null },
 *   })
 *
 * Lưu ý:
 *  - Query builder là thenable (await được) để khớp Supabase JS v2 behavior.
 *  - Tất cả chain methods (.eq, .gte, .order, .limit, ...) đều trả về this
 *    để tiếp tục chain.
 *  - .single() và .maybeSingle() resolve Promise { data, error }.
 *  - .then() default resolve với fromResult nếu không override.
 */

export interface MockQueryResult<T = unknown> {
  data: T | null
  error: { message: string; code?: string } | null
}

export interface MockSupabaseClient {
  from: Mock
  rpc: Mock
  auth: {
    getUser: Mock
    getSession: Mock
    signInWithPassword: Mock
    signOut: Mock
    admin: {
      getUserById: Mock
      listUsers: Mock
    }
  }
  storage: {
    from: Mock
  }
}

export interface MockQueryBuilder {
  select: Mock
  insert: Mock
  update: Mock
  upsert: Mock
  delete: Mock
  eq: Mock
  neq: Mock
  gt: Mock
  gte: Mock
  lt: Mock
  lte: Mock
  like: Mock
  ilike: Mock
  in: Mock
  is: Mock
  or: Mock
  and: Mock
  not: Mock
  match: Mock
  order: Mock
  limit: Mock
  range: Mock
  single: Mock
  maybeSingle: Mock
  then: <TResult1 = MockQueryResult, TResult2 = never>(
    onfulfilled?: ((value: MockQueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>
  catch: <TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ) => Promise<MockQueryResult | TResult>
}

/**
 * Tạo một query builder thenable với response có thể override per-method.
 *
 * @param defaultResult - Response mặc định khi await query (dùng cho .then())
 * @param overrides - Map method name → response cụ thể (vd: single, maybeSingle)
 */
export function createMockQueryBuilder(
  defaultResult: MockQueryResult = { data: null, error: null },
  overrides: Partial<Record<string, MockQueryResult>> = {},
): MockQueryBuilder {
  const builder: Partial<MockQueryBuilder> = {}

  // Chain methods đều trả về `this` để tiếp tục chain
  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'in', 'is', 'or', 'and', 'not', 'match',
    'order', 'limit', 'range',
  ]
  for (const method of chainMethods) {
    builder[method as keyof MockQueryBuilder] = vi.fn().mockReturnThis()
  }

  // Terminal methods trả Promise
  builder.single = vi.fn().mockResolvedValue(
    overrides.single ?? defaultResult,
  )
  builder.maybeSingle = vi.fn().mockResolvedValue(
    overrides.maybeSingle ?? defaultResult,
  )

  // .then() — make builder awaitable. Khi await query chain (không gọi single/maybeSingle),
  // trả về defaultResult. Tests chủ yếu dùng single/maybeSingle nên default chủ yếu fallback.
  const thenable = (resolve: (v: MockQueryResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(defaultResult).then(resolve, reject)
  builder.then = vi.fn().mockImplementation(thenable) as MockQueryBuilder['then']

  builder.catch = vi.fn().mockImplementation((onrejected) =>
    Promise.resolve(defaultResult).catch(onrejected),
  ) as MockQueryBuilder['catch']

  return builder as MockQueryBuilder
}

/**
 * Tạo một Supabase client mock hoàn chỉnh với .from() trả về query builder.
 *
 * @param fromResponses - Map table name → MockQueryBuilder (hoặc response default)
 */
export function createMockSupabaseClient(
  options: {
    fromResponses?: Record<string, MockQueryBuilder | MockQueryResult>
    rpcResponses?: Record<string, MockQueryResult>
  } = {},
): { client: MockSupabaseClient; queryBuilder: (resp?: MockQueryResult) => MockQueryBuilder } {
  const defaultBuilder = createMockQueryBuilder()

  const from = vi.fn((table: string) => {
    const r = options.fromResponses?.[table]
    if (!r) return defaultBuilder
    // Nếu là MockQueryResult, wrap thành builder
    if (!('select' in r)) {
      return createMockQueryBuilder(r as MockQueryResult)
    }
    return r as MockQueryBuilder
  })

  const rpc = vi.fn(async (fnName: string, _args?: unknown) => {
    return options.rpcResponses?.[fnName] ?? { data: null, error: null }
  })

  const client: MockSupabaseClient = {
    from,
    rpc,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
      },
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
      }),
    },
  }

  return {
    client,
    queryBuilder: (resp?: MockQueryResult) => createMockQueryBuilder(resp),
  }
}

/**
 * Helper để mock module @/lib/supabase/admin với default behavior.
 * Trả về { mockSupabaseAdmin, queryBuilder, mockFrom } để test dùng trực tiếp.
 */
export function setupSupabaseMock(
  options: {
    fromResponses?: Record<string, MockQueryBuilder | MockQueryResult>
    rpcResponses?: Record<string, MockQueryResult>
  } = {},
) {
  const { client, queryBuilder } = createMockSupabaseClient(options)
  return {
    mockSupabaseAdmin: client,
    queryBuilder,
    mockFrom: client.from,
  }
}

/**
 * Mock error response builder — dùng để giả lập DB error trong test.
 */
export function dbError(message: string, code?: string): { data: null; error: { message: string; code?: string } } {
  return { data: null, error: { message, code } }
}

/**
 * Mock success response builder.
 */
export function dbOk<T>(data: T): { data: T; error: null } {
  return { data, error: null }
}
