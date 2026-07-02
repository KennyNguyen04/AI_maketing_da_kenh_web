import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock BEFORE importing the module under test
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}))

import { hashContent, getCachedProfile, saveToCache } from './voice-cache'
import { supabaseAdmin } from '@/lib/supabase/admin'

describe('voice-cache: hashContent', () => {
  it('produces identical hash for same content', () => {
    expect(hashContent('Hello World')).toBe(hashContent('Hello World'))
  })

  it('produces identical hash regardless of whitespace', () => {
    expect(hashContent('hello  world   with   spaces')).toBe(
      hashContent('hello world with spaces')
    )
  })

  it('produces identical hash for different casing', () => {
    expect(hashContent('HELLO WORLD')).toBe(hashContent('hello world'))
  })

  it('produces identical hash for leading/trailing whitespace', () => {
    expect(hashContent('  hello world  ')).toBe(hashContent('hello world'))
  })

  it('produces identical hash for NFC normalized text (composed vs decomposed)', () => {
    expect(hashContent('cafe\u0301')).toBe(hashContent('café'))
  })

  it('produces different hashes for different content', () => {
    expect(hashContent('text A')).not.toBe(hashContent('text B'))
  })

  it('produces identical hash for Vietnamese text with NFC normalization', () => {
    // NFC normalization composes combining marks — same visual text = same hash
    const composed = 'cafe\u0301'
    const decomposed = 'café'
    expect(hashContent(composed)).toBe(hashContent(decomposed))
  })

  it('produces identical hash for mixed whitespace Unicode', () => {
    expect(hashContent('hello\u2003world')).toBe(hashContent('hello world'))
  })
})

describe('voice-cache: saveToCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts to voice_analysis_cache table with correct fields', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      upsert: upsertMock,
    })

    const profile = { tone: ['friendly'], system_prompt_cache: 'Bạn là...' }
    await saveToCache('user-123', 'some text content', 'text', profile)

    expect(supabaseAdmin.from).toHaveBeenCalledWith('voice_analysis_cache')
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        source_type: 'text',
        profile,
      }),
      { onConflict: 'user_id,content_hash,source_type' }
    )
  })

  it('treats same content + different source_type as separate cache entries', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      upsert: upsertMock,
    })

    await saveToCache('u1', 'content', 'url', { test: true })
    await saveToCache('u1', 'content', 'form', { test: true })

    expect(upsertMock).toHaveBeenCalledTimes(2)
  })
})

describe('voice-cache: getCachedProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when no cache entry exists', async () => {
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      }),
    })

    const result = await getCachedProfile('user-123', 'some text', 'text')
    expect(result).toBeNull()
  })

  it('returns profile on cache hit', async () => {
    const cachedProfile = { tone: ['casual'], system_prompt_cache: 'Cached prompt' }
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { profile: cachedProfile, hit_count: 3 },
              }),
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      }),
    })

    const result = await getCachedProfile('user-123', 'some text', 'text')

    expect(result).toEqual(cachedProfile)
  })

  it('calls update to increment hit_count on cache hit', async () => {
    const cachedProfile = { tone: ['test'] }
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }),
    })
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { profile: cachedProfile, hit_count: 5 },
                }),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        update: updateMock,
      })

    await getCachedProfile('user-123', 'some text', 'text')

    expect(updateMock).toHaveBeenCalledWith({
      hit_count: 6,
      last_used_at: expect.any(String),
    })
  })

  it('passes user_id, content_hash, source_type as eq filters', async () => {
    const seen = new Set<string>()
    ;(supabaseAdmin.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation((col: string) => {
          seen.add(col)
          return {
            eq: vi.fn().mockImplementation((col2: string) => {
              seen.add(col2)
              return {
                eq: vi.fn().mockImplementation((col3: string) => {
                  seen.add(col3)
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                  }
                }),
              }
            }),
          }
        }),
      }),
    })

    await getCachedProfile('uid-abc', 'hello world', 'form')

    // All three filter columns must be present in the chain
    expect(seen.has('user_id')).toBe(true)
    expect(seen.has('content_hash')).toBe(true)
    expect(seen.has('source_type')).toBe(true)
  })
})
