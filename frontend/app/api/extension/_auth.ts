import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

const SALT_LENGTH = 16
const HASH_ITERATIONS = 100_000
const KEY_PREFIX_LENGTH = 8

function hashToken(token: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const hash = createHash('sha256')
  hash.update(salt)
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash.update(token)
  }
  return `${salt.toString('hex')}:${hash.digest('hex')}`
}

function verifyHash(token: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':')
  if (!saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const hash = createHash('sha256')
  hash.update(salt)
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash.update(token)
  }
  const computed = hash.digest()
  const expected = Buffer.from(hashHex, 'hex')
  if (computed.length !== expected.length) return false
  return timingSafeEqual(computed, expected)
}

export function getKeyPrefix(token: string): string {
  return token.slice(0, KEY_PREFIX_LENGTH)
}

/**
 * Find the api_key row matching the given plaintext token.
 *
 * Lookup strategy:
 * 1. Try indexed prefix lookup (fast path for keys created after migration 010)
 * 2. Fallback: scan all keys with empty prefix (legacy keys) and verify hash
 *
 * Returns null if no match found.
 */
async function findKeyByToken(token: string) {
  if (!token || token.length < KEY_PREFIX_LENGTH) return null

  const prefix = getKeyPrefix(token)

  // Fast path: indexed prefix lookup
  // NOTE: use service-role client to bypass RLS on api_keys.
  // The anon (cookie-based) client cannot read api_keys rows that don't
  // belong to auth.uid() — but here we authenticate the very token whose
  // api_keys row we're trying to find, so RLS would always return 0.
  const { data: prefixMatches } = await supabaseAdmin
    .from('api_keys')
    .select('user_id, name, last_used_at, key_hash, key_prefix')
    .eq('key_prefix', prefix)

  for (const row of prefixMatches || []) {
    if (verifyHash(token, row.key_hash)) {
      return { user_id: row.user_id, name: row.name, last_used_at: row.last_used_at }
    }
  }

  // Fallback: legacy keys with empty prefix (created before migration 010)
  const { data: legacyMatches } = await supabaseAdmin
    .from('api_keys')
    .select('user_id, name, last_used_at, key_hash')
    .or('key_prefix.is.null,key_prefix.eq.')

  for (const row of legacyMatches || []) {
    if (verifyHash(token, row.key_hash)) {
      return { user_id: row.user_id, name: row.name, last_used_at: row.last_used_at }
    }
  }

  return null
}

async function verifyToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const row = await findKeyByToken(token)
  return row?.user_id || null
}

async function getTokenRecord(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const row = await findKeyByToken(token)
  return row || null
}

export { hashToken, verifyToken, getTokenRecord, findKeyByToken }