import { createHash, randomBytes } from 'crypto'

export function createOAuthState() {
  return randomBytes(24).toString('base64url')
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
