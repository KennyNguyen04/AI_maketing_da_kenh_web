/**
 * Debug: Investigate why findKeyByToken returns null
 * Run same logic locally and trace
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from './setup.mjs'

const SALT_LENGTH = 16
const HASH_ITERATIONS = 100_000
const KEY_PREFIX_LENGTH = 8

function hashToken(token) {
  const salt = randomBytes(SALT_LENGTH)
  const hash = createHash('sha256')
  hash.update(salt)
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash.update(token)
  }
  return `${salt.toString('hex')}:${hash.digest('hex')}`
}

function verifyHash(token, storedHash) {
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

console.log('=== Debug findKeyByToken ===\n')

// Setup
const TEST_EMAIL = `debug-${Date.now()}@amplify-test.local`
const { data: userData } = await supabaseAdmin.auth.admin.createUser({
  email: TEST_EMAIL,
  password: 'TestPass123!@#',
  email_confirm: true
})
const userId = userData.user.id

const token = `amp_${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`
const prefix = token.slice(0, 8)
const hash = hashToken(token)

console.log('Token:', token.slice(0, 20) + '...')
console.log('Prefix:', prefix)
console.log('Hash (first 30):', hash.slice(0, 30) + '...')

await supabaseAdmin.from('api_keys').insert({
  user_id: userId,
  name: 'Debug Test',
  key_hash: hash,
  key_prefix: prefix
})

console.log('\n--- Step 1: Test prefix lookup ---')
const { data: prefixMatches, error: e1 } = await supabaseAdmin
  .from('api_keys')
  .select('user_id, name, key_hash, key_prefix')
  .eq('key_prefix', prefix)

console.log('Query error:', e1?.message || 'none')
console.log('Matches:', prefixMatches?.length || 0)
if (prefixMatches?.length > 0) {
  console.log('First match:', {
    user_id: prefixMatches[0].user_id,
    key_prefix: prefixMatches[0].key_prefix,
    hash_first30: prefixMatches[0].key_hash?.slice(0, 30)
  })
}

console.log('\n--- Step 2: Test verifyHash locally ---')
const verifyResult = verifyHash(token, hash)
console.log('verifyHash result:', verifyResult)

console.log('\n--- Step 3: Test full flow ---')
let found = false
for (const row of prefixMatches || []) {
  if (verifyHash(token, row.key_hash)) {
    found = true
    console.log('MATCHED row:', row.user_id)
    break
  }
}
console.log('findKeyByToken result:', found ? 'FOUND' : 'NOT FOUND')

// Cleanup
await supabaseAdmin.from('api_keys').delete().eq('user_id', userId)
await supabaseAdmin.auth.admin.deleteUser(userId)
