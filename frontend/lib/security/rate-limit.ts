/**
 * Client-side rate limiter for sensitive forms (login, register).
 *
 * Stores attempt counts in localStorage keyed by action + identifier
 * (e.g. email). After MAX_ATTEMPTS within WINDOW_MS, blocks until
 * the lockout period expires.
 *
 * SECURITY NOTE: This is a UX layer, NOT a security boundary.
 * Real protection must be server-side (rate limit by IP / account).
 * A determined attacker can clear localStorage. Use to slow down
 * casual brute force + give clear user feedback.
 */

const STORAGE_PREFIX = 'amplify_rl:'

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  lockoutMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

interface AttemptRecord {
  attempts: number
  firstAttemptAt: number
  lockedUntil: number | null
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockoutMs: 15 * 60 * 1000,
}

function readRecord(key: string): AttemptRecord {
  if (typeof window === 'undefined') {
    return { attempts: 0, firstAttemptAt: 0, lockedUntil: null }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return { attempts: 0, firstAttemptAt: 0, lockedUntil: null }
    const parsed = JSON.parse(raw) as AttemptRecord
    return parsed
  } catch {
    return { attempts: 0, firstAttemptAt: 0, lockedUntil: null }
  }
}

function writeRecord(key: string, record: AttemptRecord): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(record))
  } catch {
    // localStorage quota exceeded or disabled - silently ignore
  }
}

export function checkRateLimit(action: string, identifier: string, config: Partial<RateLimitConfig> = {}): RateLimitResult {
  const { maxAttempts, windowMs } = { ...DEFAULT_CONFIG, ...config }
  const key = `${action}:${identifier.toLowerCase()}`
  const now = Date.now()
  const record = readRecord(key)

  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: record.lockedUntil - now,
    }
  }

  if (record.firstAttemptAt && now - record.firstAttemptAt > windowMs) {
    writeRecord(key, { attempts: 0, firstAttemptAt: 0, lockedUntil: null })
    return { allowed: true, remaining: maxAttempts, retryAfterMs: 0 }
  }

  const remaining = Math.max(0, maxAttempts - record.attempts)
  return {
    allowed: remaining > 0,
    remaining,
    retryAfterMs: 0,
  }
}

export function recordFailedAttempt(action: string, identifier: string, config: Partial<RateLimitConfig> = {}): RateLimitResult {
  const { maxAttempts, windowMs, lockoutMs } = { ...DEFAULT_CONFIG, ...config }
  const key = `${action}:${identifier.toLowerCase()}`
  const now = Date.now()
  const record = readRecord(key)

  if (record.firstAttemptAt && now - record.firstAttemptAt > windowMs) {
    writeRecord(key, { attempts: 1, firstAttemptAt: now, lockedUntil: null })
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 }
  }

  const newAttempts = record.attempts + 1
  const lockedUntil = newAttempts >= maxAttempts ? now + lockoutMs : null

  writeRecord(key, {
    attempts: newAttempts,
    firstAttemptAt: record.firstAttemptAt || now,
    lockedUntil,
  })

  if (lockedUntil) {
    return { allowed: false, remaining: 0, retryAfterMs: lockoutMs }
  }

  return { allowed: true, remaining: maxAttempts - newAttempts, retryAfterMs: 0 }
}

export function recordSuccessfulAttempt(action: string, identifier: string): void {
  const key = `${action}:${identifier.toLowerCase()}`
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    // ignore
  }
}

export function formatRetryAfter(ms: number): string {
  const minutes = Math.ceil(ms / 60000)
  if (minutes < 1) return 'vài giây / a few seconds'
  if (minutes === 1) return '1 phút / 1 minute'
  return `${minutes} phút / ${minutes} minutes`
}