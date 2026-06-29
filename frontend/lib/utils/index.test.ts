import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  cn,
  formatVietnameseDate,
  formatRelativeTime,
  truncate,
  capitalize,
} from './index'

describe('lib/utils: formatVietnameseDate', () => {
  it('formats a valid ISO string into Vietnamese locale', () => {
    expect(formatVietnameseDate('2026-05-28T00:00:00Z')).toBe('28 tháng 5, 2026')
  })

  it('formats a date at year boundary', () => {
    expect(formatVietnameseDate('2026-01-01T00:00:00Z')).toBe('1 tháng 1, 2026')
  })

  it('formats a date at end of month', () => {
    expect(formatVietnameseDate('2026-12-31T00:00:00Z')).toBe('31 tháng 12, 2026')
  })

  it('returns null for invalid date string', () => {
    expect(formatVietnameseDate('not-a-date')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(formatVietnameseDate('')).toBeNull()
  })

  it('returns null for malformed numeric value', () => {
    expect(formatVietnameseDate('foo-99-bar')).toBeNull()
  })

  it('handles single-digit day correctly (no leading zero)', () => {
    expect(formatVietnameseDate('2026-03-05T00:00:00Z')).toBe('5 tháng 3, 2026')
  })

  it('handles leap year February 29', () => {
    expect(formatVietnameseDate('2024-02-29T00:00:00Z')).toBe('29 tháng 2, 2024')
  })
})

describe('lib/utils: formatRelativeTime', () => {
  const NOW = new Date('2026-06-30T12:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  it('returns "vừa xong" for less than 1 minute ago', () => {
    const date = new Date(NOW.getTime() - 30 * 1000) // 30 sec ago
    expect(formatRelativeTime(date)).toBe('vừa xong')
  })

  it('returns minutes ago in Vietnamese', () => {
    const date = new Date(NOW.getTime() - 5 * 60 * 1000) // 5 min ago
    expect(formatRelativeTime(date)).toBe('5 phút trước')
  })

  it('returns hours ago in Vietnamese', () => {
    const date = new Date(NOW.getTime() - 3 * 60 * 60 * 1000) // 3 hours ago
    expect(formatRelativeTime(date)).toBe('3 giờ trước')
  })

  it('returns days ago for less than 7 days', () => {
    const date = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    expect(formatRelativeTime(date)).toBe('2 ngày trước')
  })

  it('falls back to formatVietnameseDate for 7+ days', () => {
    const date = new Date('2026-06-23T12:00:00Z') // 7 days ago
    const result = formatRelativeTime(date)
    expect(result).toContain('tháng')
    expect(result).toContain('2026')
  })

  it('returns "vừa xong" for invalid date string', () => {
    expect(formatRelativeTime('not-a-date')).toBe('vừa xong')
  })

  it('returns "vừa xong" for invalid Date object', () => {
    expect(formatRelativeTime(new Date('invalid'))).toBe('vừa xong')
  })

  it('accepts ISO string input', () => {
    const isoString = new Date(NOW.getTime() - 10 * 60 * 1000).toISOString()
    expect(formatRelativeTime(isoString)).toBe('10 phút trước')
  })
})

describe('lib/utils: truncate', () => {
  it('returns original text when shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('returns original text when equal to maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('truncates with ellipsis when longer than maxLength', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('')
  })

  it('handles maxLength of 3 (minimum + ellipsis)', () => {
    expect(truncate('hello', 3)).toBe('...')
  })

  it('preserves Vietnamese characters correctly', () => {
    expect(truncate('Xin chào các bạn', 10)).toBe('Xin chà...')
  })
})

describe('lib/utils: capitalize', () => {
  it('capitalizes first letter of lowercase string', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('returns original string when first char is uppercase', () => {
    expect(capitalize('Hello')).toBe('Hello')
  })

  it('handles single character', () => {
    expect(capitalize('a')).toBe('A')
  })

  it('handles empty string gracefully', () => {
    expect(capitalize('')).toBe('')
  })

  it('preserves rest of string as-is', () => {
    expect(capitalize('hello WORLD')).toBe('Hello WORLD')
  })
})

describe('lib/utils: cn (tailwind-merge wrapper)', () => {
  it('merges multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('clsx does NOT dedupe literal strings (only conditional truthy/falsy)', () => {
    // clsx preserves duplicate class strings; deduping is the caller's job
    expect(cn('foo', 'foo')).toBe('foo foo')
  })

  it('handles falsy values', () => {
    expect(cn('foo', false, null, undefined, 'bar')).toBe('foo bar')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('conflicts are resolved by tailwind-merge (last wins)', () => {
    // twMerge: "p-2" and "p-4" → "p-4" wins
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})