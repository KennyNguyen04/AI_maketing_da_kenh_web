import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { randomDelay, formatDelay, sleep, needsDelay, calculateRecommendedDelay } from './delays'

describe('lib/social/delays: randomDelay', () => {
  it('returns value within range [min, max]', () => {
    for (let i = 0; i < 100; i++) {
      const delay = randomDelay(1000, 5000)
      expect(delay).toBeGreaterThanOrEqual(1000)
      expect(delay).toBeLessThanOrEqual(5000)
    }
  })

  it('uses default 5-20 min range when no args', () => {
    const delay = randomDelay()
    expect(delay).toBeGreaterThanOrEqual(5 * 60 * 1000)
    expect(delay).toBeLessThanOrEqual(20 * 60 * 1000)
  })

  it('returns integer (Math.floor)', () => {
    const delay = randomDelay(1000, 5000)
    expect(Number.isInteger(delay)).toBe(true)
  })

  it('handles equal min and max', () => {
    const delay = randomDelay(1000, 1000)
    expect(delay).toBe(1000)
  })

  it('produces variety across many calls', () => {
    const set = new Set<number>()
    for (let i = 0; i < 50; i++) {
      set.add(randomDelay(100, 1000))
    }
    // With 50 calls in 100-1000 range, should produce many distinct values
    expect(set.size).toBeGreaterThan(20)
  })
})

describe('lib/social/delays: formatDelay', () => {
  it('formats minutes only', () => {
    expect(formatDelay(5 * 60 * 1000)).toBe('5 minutes')
  })

  it('formats 1 minute (singular, no s)', () => {
    expect(formatDelay(60 * 1000)).toBe('1 minute')
  })

  it('formats minutes with seconds', () => {
    expect(formatDelay(5 * 60 * 1000 + 30 * 1000)).toBe('5 minutes 30s')
  })

  it('formats seconds only (< 1 minute)', () => {
    expect(formatDelay(45 * 1000)).toBe('45 seconds')
  })

  it('formats 1 second (singular, no s)', () => {
    expect(formatDelay(1000)).toBe('1 second')
  })

  it('formats exact 1 minute no seconds', () => {
    expect(formatDelay(60 * 1000)).toBe('1 minute')
  })

  it('formats exact 0 seconds', () => {
    expect(formatDelay(0)).toBe('0 seconds')
  })

  it('formats very large value', () => {
    const result = formatDelay(120 * 60 * 1000) // 2 hours = 120 min
    expect(result).toBe('120 minutes')
  })
})

describe('lib/social/delays: sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves after specified duration', async () => {
    const promise = sleep(1000)
    vi.advanceTimersByTime(1000)
    await expect(promise).resolves.toBeUndefined()
  })

  it('does not resolve before duration', async () => {
    let resolved = false
    sleep(1000).then(() => { resolved = true })
    vi.advanceTimersByTime(999)
    await Promise.resolve() // flush microtasks
    expect(resolved).toBe(false)
  })

  it('resolves exactly at duration', async () => {
    let resolved = false
    sleep(500).then(() => { resolved = true })
    vi.advanceTimersByTime(500)
    await Promise.resolve()
    expect(resolved).toBe(true)
  })
})

describe('lib/social/delays: needsDelay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-30T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false when no last post', () => {
    expect(needsDelay(null)).toBe(false)
  })

  it('returns true when last post < 30 min ago (default)', () => {
    const lastPost = new Date('2026-06-30T11:45:00Z') // 15 min ago
    expect(needsDelay(lastPost)).toBe(true)
  })

  it('returns false when last post >= 30 min ago (default)', () => {
    const lastPost = new Date('2026-06-30T11:00:00Z') // 60 min ago
    expect(needsDelay(lastPost)).toBe(false)
  })

  it('uses custom minGapMinutes parameter', () => {
    const lastPost = new Date('2026-06-30T11:55:00Z') // 5 min ago
    expect(needsDelay(lastPost, 10)).toBe(true) // 5 < 10
    expect(needsDelay(lastPost, 3)).toBe(false) // 5 > 3
  })

  it('returns false when last post exactly at threshold', () => {
    const lastPost = new Date('2026-06-30T11:30:00Z') // exactly 30 min ago
    expect(needsDelay(lastPost, 30)).toBe(false)
  })

  it('handles Date object input', () => {
    const lastPost = new Date(Date.now() - 5 * 60 * 1000)
    expect(needsDelay(lastPost)).toBe(true)
  })
})

describe('lib/social/delays: calculateRecommendedDelay', () => {
  it('returns 5-10 min delay for low usage (< 30%)', () => {
    for (let i = 0; i < 20; i++) {
      const delay = calculateRecommendedDelay(2, 100) // 2% usage
      expect(delay).toBeGreaterThanOrEqual(5 * 60 * 1000)
      expect(delay).toBeLessThanOrEqual(10 * 60 * 1000)
    }
  })

  it('returns 10-15 min delay for medium usage (30-60%)', () => {
    for (let i = 0; i < 20; i++) {
      const delay = calculateRecommendedDelay(50, 100) // 50% usage
      expect(delay).toBeGreaterThanOrEqual(10 * 60 * 1000)
      expect(delay).toBeLessThanOrEqual(15 * 60 * 1000)
    }
  })

  it('returns 15-25 min delay for high usage (60-80%)', () => {
    for (let i = 0; i < 20; i++) {
      const delay = calculateRecommendedDelay(70, 100) // 70% usage
      expect(delay).toBeGreaterThanOrEqual(15 * 60 * 1000)
      expect(delay).toBeLessThanOrEqual(25 * 60 * 1000)
    }
  })

  it('returns 25-40 min delay for near-limit usage (>= 80%)', () => {
    for (let i = 0; i < 20; i++) {
      const delay = calculateRecommendedDelay(90, 100) // 90% usage
      expect(delay).toBeGreaterThanOrEqual(25 * 60 * 1000)
      expect(delay).toBeLessThanOrEqual(40 * 60 * 1000)
    }
  })

  it('higher usage results in longer delays (monotonic)', () => {
    const low = calculateRecommendedDelay(10, 100)
    const med = calculateRecommendedDelay(50, 100)
    const high = calculateRecommendedDelay(70, 100)
    const peak = calculateRecommendedDelay(95, 100)
    // The minimums are increasing: 5 < 10 < 15 < 25
    expect(low).toBeLessThanOrEqual(10 * 60 * 1000)
    expect(med).toBeGreaterThanOrEqual(10 * 60 * 1000)
    expect(high).toBeGreaterThanOrEqual(15 * 60 * 1000)
    expect(peak).toBeGreaterThanOrEqual(25 * 60 * 1000)
  })

  it('handles 0% usage', () => {
    const delay = calculateRecommendedDelay(0, 100)
    expect(delay).toBeGreaterThanOrEqual(5 * 60 * 1000)
  })

  it('handles 100% usage (max delay)', () => {
    const delay = calculateRecommendedDelay(100, 100)
    expect(delay).toBeGreaterThanOrEqual(25 * 60 * 1000)
    expect(delay).toBeLessThanOrEqual(40 * 60 * 1000)
  })

  it('handles edge case: postsToday > maxDailyPosts', () => {
    const delay = calculateRecommendedDelay(150, 100) // 150% — over limit
    expect(delay).toBeGreaterThanOrEqual(25 * 60 * 1000)
  })
})