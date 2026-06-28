/**
 * Client-side throttling utility to prevent accidental double-submissions
 * and rapid duplicate requests.
 *
 * Useful for form submissions, button clicks, and other user actions that
 * should not fire more than once within a cooldown window.
 */
export function throttleByKey<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  cooldownMs: number = 1000,
) {
  const lastCall = new Map<string, number>()

  return async (...args: TArgs): Promise<TReturn> => {
    const key = JSON.stringify(args)
    const now = Date.now()
    const last = lastCall.get(key) || 0

    if (now - last < cooldownMs) {
      throw new Error('Too many requests. Please wait a moment.')
    }

    lastCall.set(key, now)
    return await fn(...args)
  }
}

/**
 * Returns true if the action should be debounced (recently called).
 * Use for boolean-style checks in event handlers.
 */
const lastFired = new Map<string, number>()
export function shouldDebounce(key: string, cooldownMs: number = 500): boolean {
  const now = Date.now()
  const last = lastFired.get(key) || 0
  if (now - last < cooldownMs) return true
  lastFired.set(key, now)
  return false
}