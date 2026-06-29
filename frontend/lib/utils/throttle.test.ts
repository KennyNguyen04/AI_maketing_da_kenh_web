import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { throttleByKey, shouldDebounce } from './throttle'

describe('lib/utils/throttle: throttleByKey', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('executes the wrapped function on first call', async () => {
    const fn = vi.fn().mockResolvedValue('result')
    const wrapped = throttleByKey(fn, 1000)
    const promise = wrapped('arg1')
    await vi.runAllTimersAsync()
    await promise
    expect(fn).toHaveBeenCalledWith('arg1')
  })

  it('passes through return value', async () => {
    const fn = vi.fn().mockResolvedValue(42)
    const wrapped = throttleByKey(fn, 1000)
    const promise = wrapped()
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBe(42)
  })

  it('blocks second call within cooldown window', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const wrapped = throttleByKey(fn, 1000)

    const p1 = wrapped('key1')
    await vi.runAllTimersAsync()
    await p1

    // Second call within cooldown should throw
    await expect(wrapped('key1')).rejects.toThrow(/Too many requests/)
  })

  it('allows different keys concurrently (per-key isolation)', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const wrapped = throttleByKey(fn, 1000)

    const p1 = wrapped('key1')
    const p2 = wrapped('key2')
    await vi.runAllTimersAsync()
    await p1
    await p2

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1, 'key1')
    expect(fn).toHaveBeenNthCalledWith(2, 'key2')
  })

  it('uses default 1000ms cooldown when not specified', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const wrapped = throttleByKey(fn) // default

    const p1 = wrapped()
    await vi.runAllTimersAsync()
    await p1

    // Within 1000ms, second call should throw
    await expect(wrapped()).rejects.toThrow(/Too many requests/)
  })

  it('allows second call after cooldown expires', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const wrapped = throttleByKey(fn, 1000)

    const p1 = wrapped('key1')
    await vi.runAllTimersAsync()
    await p1

    // Advance time past cooldown
    vi.advanceTimersByTime(1500)

    const p2 = wrapped('key1')
    await vi.runAllTimersAsync()
    await p2

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('handles multiple positional arguments via JSON.stringify', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const wrapped = throttleByKey(fn, 1000)

    const p1 = wrapped('a', 'b', 'c')
    await vi.runAllTimersAsync()
    await p1

    // Same args (JSON same) should be blocked
    await expect(wrapped('a', 'b', 'c')).rejects.toThrow()
  })

  it('does NOT block args with different content even if same string length', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const wrapped = throttleByKey(fn, 1000)

    const p1 = wrapped('a1')
    await vi.runAllTimersAsync()
    await p1

    const p2 = wrapped('a2')
    await vi.runAllTimersAsync()
    await p2

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('propagates errors from wrapped function', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('upstream error'))
    const wrapped = throttleByKey(fn, 1000)

    await expect(wrapped()).rejects.toThrow('upstream error')
  })
})

describe('lib/utils/throttle: shouldDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false on first call (allows action)', () => {
    expect(shouldDebounce('button1')).toBe(false)
  })

  it('returns true on second call within cooldown', () => {
    shouldDebounce('button1')
    expect(shouldDebounce('button1')).toBe(true)
  })

  it('returns false after cooldown expires', () => {
    shouldDebounce('button1')
    vi.advanceTimersByTime(600) // > default 500ms
    expect(shouldDebounce('button1')).toBe(false)
  })

  it('uses default 500ms cooldown', () => {
    shouldDebounce('btn')
    vi.advanceTimersByTime(400)
    expect(shouldDebounce('btn')).toBe(true) // still within 500ms
    vi.advanceTimersByTime(200)
    expect(shouldDebounce('btn')).toBe(false) // 600ms total
  })

  it('respects custom cooldownMs parameter', () => {
    // Use unique keys to avoid module-level state pollution across tests
    expect(shouldDebounce('custom1', 2000)).toBe(false) // first call
    vi.advanceTimersByTime(1500)
    expect(shouldDebounce('custom1', 2000)).toBe(true) // still within 2000ms
    vi.advanceTimersByTime(600)
    expect(shouldDebounce('custom1', 2000)).toBe(false) // past 2000ms
  })

  it('isolates state per key', () => {
    expect(shouldDebounce('btn1')).toBe(false)
    expect(shouldDebounce('btn2')).toBe(false)
    expect(shouldDebounce('btn1')).toBe(true) // btn1 debounced
    expect(shouldDebounce('btn2')).toBe(true) // btn2 debounced
    expect(shouldDebounce('btn3')).toBe(false) // btn3 fresh
  })
})