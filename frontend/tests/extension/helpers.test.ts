/**
 * Extension helpers — unit test chạy bằng Vitest.
 *
 * Lưu ý: file helpers.js nằm trong extension/lib/ — KHÔNG trong frontend/lib/.
 * Để Vitest pick up được, dùng include glob mở rộng hoặc đặt test ngay cạnh.
 *
 * Helpers này là pure functions extracted từ background.js/popup.js để verify
 * logic quan trọng (retry, scheduling, channel mapping, stale detection).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
// Source file lives outside frontend/, so we can't use @ alias.
// Resolve relative to this test file's location.
import {
  shouldRetryTask,
  calculateRetryDelay,
  buildProcessingState,
  getChannelDisplayName,
  getPlatformUrl,
  isStaleProcessingTask,
  isTaskReadyNow,
  isSupportedPlatformUrl,
} from '../../../extension/lib/helpers.js'

// ─── 1. shouldRetryTask ─────────────────────────────────────────────

describe('extension/helpers: shouldRetryTask', () => {
  it('returns true when retryCount below default maxRetries (2)', () => {
    expect(shouldRetryTask(0)).toBe(true)
    expect(shouldRetryTask(1)).toBe(true)
  })

  it('returns false when retryCount at or above maxRetries', () => {
    expect(shouldRetryTask(2)).toBe(false)
    expect(shouldRetryTask(3)).toBe(false)
  })

  it('respects custom maxRetries', () => {
    expect(shouldRetryTask(2, 3)).toBe(true)
    expect(shouldRetryTask(3, 3)).toBe(false)
  })

  it('returns false for non-number retryCount', () => {
    expect(shouldRetryTask(undefined)).toBe(false)
    expect(shouldRetryTask(null)).toBe(false)
    expect(shouldRetryTask('1')).toBe(false)
  })
})

// ─── 2. calculateRetryDelay ─────────────────────────────────────────

describe('extension/helpers: calculateRetryDelay', () => {
  // Mirror background.js retryTask():
  //   const retryCount = (processing.retryCount || 0) + 1;
  //   const delay = Math.pow(2, retryCount) * 1000;  // exponential backoff
  // Với base = 1000ms (production default), retry thứ 1 → 2s, 2 → 4s, 3 → 8s.
  it('production backoff: 2s, 4s, 8s with base 1000ms', () => {
    expect(calculateRetryDelay(1, 1000)).toBe(2000)
    expect(calculateRetryDelay(2, 1000)).toBe(4000)
    expect(calculateRetryDelay(3, 1000)).toBe(8000)
  })

  it('respects custom base (e.g., base 2000 for faster tests)', () => {
    // Test helper default trong code là base 2000 — cho phép test nhanh hơn.
    expect(calculateRetryDelay(1, 2000)).toBe(4000)
    expect(calculateRetryDelay(2, 2000)).toBe(8000)
    expect(calculateRetryDelay(3, 2000)).toBe(16000)
  })
})

// ─── 3. buildProcessingState ────────────────────────────────────────

describe('extension/helpers: buildProcessingState', () => {
  it('returns processingState and automatorPayload with consistent task id', () => {
    const task = {
      id: 'task-123',
      channel: 'facebook',
      content: 'Hello world',
      images: ['https://x.com/img.png'],
      target_id: null,
      target_type: null,
    }
    const { processingState, automatorPayload } = buildProcessingState(task, 42, true)

    expect(processingState.id).toBe('task-123')
    expect(processingState.tabId).toBe(42)
    expect(processingState.channel).toBe('facebook')
    expect(processingState.background).toBe(true)
    expect(processingState.retryCount).toBe(0)
    expect(processingState.startedAt).toBeGreaterThan(0)

    expect(automatorPayload.id).toBe('task-123')
    expect(automatorPayload.content).toBe('Hello world')
    expect(automatorPayload.images).toEqual(['https://x.com/img.png'])
  })

  it('defaults images to [] when missing', () => {
    const task = { id: 't', channel: 'x', content: 'c' }
    const { automatorPayload } = buildProcessingState(task, 1, false)
    expect(automatorPayload.images).toEqual([])
  })

  it('coerces runInBackground to boolean', () => {
    const task = { id: 't', channel: 'x', content: 'c' }
    expect(buildProcessingState(task, 1, undefined).processingState.background).toBe(false)
    expect(buildProcessingState(task, 1, true).processingState.background).toBe(true)
    expect(buildProcessingState(task, 1, false).processingState.background).toBe(false)
  })
})

// ─── 4. getChannelDisplayName ───────────────────────────────────────

describe('extension/helpers: getChannelDisplayName', () => {
  it('returns display name for canonical channels', () => {
    expect(getChannelDisplayName('facebook')).toBe('Facebook')
    expect(getChannelDisplayName('facebook-group')).toBe('Facebook Group')
    expect(getChannelDisplayName('threads')).toBe('Threads')
    expect(getChannelDisplayName('instagram')).toBe('Instagram')
    expect(getChannelDisplayName('x')).toBe('X (Twitter)')
  })

  it('returns same name for legacy twitter alias', () => {
    expect(getChannelDisplayName('twitter')).toBe(getChannelDisplayName('x'))
  })

  it('returns the raw channel for unknown values', () => {
    expect(getChannelDisplayName('myspace')).toBe('myspace')
    expect(getChannelDisplayName('')).toBe('')
  })
})

// ─── 5. getPlatformUrl ──────────────────────────────────────────────

describe('extension/helpers: getPlatformUrl', () => {
  it('returns static URL for personal channels', () => {
    expect(getPlatformUrl({ channel: 'facebook' })).toBe('https://www.facebook.com/')
    expect(getPlatformUrl({ channel: 'threads' })).toBe('https://www.threads.net')
    expect(getPlatformUrl({ channel: 'instagram' })).toBe('https://www.instagram.com')
    expect(getPlatformUrl({ channel: 'x' })).toBe('https://x.com/compose/post')
  })

  it('interpolates target_id for facebook-group', () => {
    expect(getPlatformUrl({ channel: 'facebook-group', target_id: 'group-abc' }))
      .toBe('https://www.facebook.com/groups/group-abc')
  })

  it('falls back to facebook.com for unknown channels', () => {
    expect(getPlatformUrl({ channel: 'myspace' })).toBe('https://www.facebook.com/')
  })
})

// ─── 6. isStaleProcessingTask ───────────────────────────────────────

describe('extension/helpers: isStaleProcessingTask', () => {
  const now = new Date('2026-01-01T12:00:00Z').getTime()

  it('returns false for non-processing tasks', () => {
    expect(isStaleProcessingTask({ status: 'pending', updated_at: new Date(now - 10 * 60 * 1000).toISOString() }, now)).toBe(false)
    expect(isStaleProcessingTask({ status: 'completed', updated_at: new Date(now - 60 * 60 * 1000).toISOString() }, now)).toBe(false)
  })

  it('returns false for recently updated processing task (< 5 min)', () => {
    expect(isStaleProcessingTask({
      status: 'processing',
      updated_at: new Date(now - 4 * 60 * 1000).toISOString(),
    }, now)).toBe(false)
  })

  it('returns true for stale processing task (>= 5 min)', () => {
    expect(isStaleProcessingTask({
      status: 'processing',
      updated_at: new Date(now - 6 * 60 * 1000).toISOString(),
    }, now)).toBe(true)
  })

  it('returns true for processing task without updated_at', () => {
    expect(isStaleProcessingTask({ status: 'processing' }, now)).toBe(true)
  })

  it('respects custom threshold', () => {
    const recent = new Date(now - 30 * 1000).toISOString()
    expect(isStaleProcessingTask({ status: 'processing', updated_at: recent }, now, 10 * 1000)).toBe(true)
    expect(isStaleProcessingTask({ status: 'processing', updated_at: recent }, now, 60 * 1000)).toBe(false)
  })
})

// ─── 7. isTaskReadyNow ──────────────────────────────────────────────

describe('extension/helpers: isTaskReadyNow', () => {
  const now = new Date('2026-01-01T12:00:00Z').getTime()

  it('returns false for null task', () => {
    expect(isTaskReadyNow(null, now)).toBe(false)
  })

  it('returns true for urgent task (priority >= 100) regardless of scheduled_for', () => {
    expect(isTaskReadyNow({ priority: 100, scheduled_for: new Date(now + 60 * 60 * 1000).toISOString() }, now)).toBe(true)
    expect(isTaskReadyNow({ priority: 200 }, now)).toBe(true)
  })

  it('returns true for past scheduled_for', () => {
    expect(isTaskReadyNow({ scheduled_for: new Date(now - 60 * 1000).toISOString() }, now)).toBe(true)
  })

  it('returns true when scheduled_for missing', () => {
    expect(isTaskReadyNow({}, now)).toBe(true)
  })

  it('returns false for future scheduled_for with low priority', () => {
    expect(isTaskReadyNow({
      priority: 0,
      scheduled_for: new Date(now + 60 * 60 * 1000).toISOString(),
    }, now)).toBe(false)
  })
})

// ─── 8. isSupportedPlatformUrl ──────────────────────────────────────

describe('extension/helpers: isSupportedPlatformUrl', () => {
  it('returns true for supported platforms', () => {
    expect(isSupportedPlatformUrl('https://www.facebook.com/')).toBe(true)
    expect(isSupportedPlatformUrl('https://www.threads.net/@user')).toBe(true)
    expect(isSupportedPlatformUrl('https://www.instagram.com/')).toBe(true)
    expect(isSupportedPlatformUrl('https://x.com/home')).toBe(true)
    expect(isSupportedPlatformUrl('https://twitter.com/home')).toBe(true)
  })

  it('returns false for unsupported platforms', () => {
    expect(isSupportedPlatformUrl('https://example.com')).toBe(false)
    expect(isSupportedPlatformUrl('https://linkedin.com/feed')).toBe(false)
  })

  it('returns false for non-string input', () => {
    expect(isSupportedPlatformUrl(null)).toBe(false)
    expect(isSupportedPlatformUrl(undefined)).toBe(false)
    expect(isSupportedPlatformUrl(42)).toBe(false)
  })
})
