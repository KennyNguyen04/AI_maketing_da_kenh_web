import { createHash, randomBytes } from 'crypto'

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export function createOAuthState() {
  const timestamp = Date.now()
  const nonce = randomBytes(16).toString('hex')
  return `${timestamp.toString(36)}:${nonce}`
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 * Always iterates over max(a.length, b.length) to avoid leaking length.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length // length mismatch contributes to diff
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

/**
 * Validates an OAuth state string received from the provider.
 * If `expectedState` is provided, compares it in constant time before
 * checking expiry.
 */
export function isOAuthStateValid(state: string, expectedState?: string): boolean {
  if (expectedState !== undefined && !timingSafeEqualString(state, expectedState)) {
    return false
  }
  const parts = state.split(':')
  if (parts.length !== 2) return false
  const timestamp = parseInt(parts[0], 36)
  if (isNaN(timestamp)) return false
  return Date.now() - timestamp < OAUTH_STATE_TTL_MS
}

export function createCodeVerifier() {
  return randomBytes(32).toString('base64url')
}

export function createCodeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function addQueryParams(baseUrl: string, params: Record<string, string>) {
  const url = new URL(baseUrl)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  return url.toString()
}
