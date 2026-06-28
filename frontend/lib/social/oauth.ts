import { createHash, randomBytes } from 'crypto'

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export function createOAuthState() {
  const timestamp = Date.now()
  const nonce = randomBytes(16).toString('hex')
  return `${timestamp.toString(36)}:${nonce}`
}

export function isOAuthStateValid(state: string): boolean {
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

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 * Returns false on length mismatch instead of leaking length through timing.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
