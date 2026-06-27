/**
 * Bước 2: Verify key_prefix được lưu đúng khi tạo key mới
 *
 * Approach: Since POST /api/user/api-token requires browser cookies (not bearer),
 * we simulate the same code path using service role client directly:
 *   1. Generate token with same format as route.ts (amp_ + uuid + timestamp_base36)
 *   2. Hash with hashToken (imported from compiled module — but TS only)
 *   3. Compute prefix
 *   4. Insert into api_keys
 *
 * Note: We can't import TS hashToken directly. We re-implement it here
 * to match exactly. Keep in sync with frontend/app/api/extension/_auth.ts.
 */

import { createHash, randomBytes } from 'crypto'
import { supabaseAdmin } from './setup.mjs'

const SALT_LENGTH = 16
const HASH_ITERATIONS = 100_000
const KEY_PREFIX_LENGTH = 8

// Mirrors hashToken() from _auth.ts
function hashToken(token) {
  const salt = randomBytes(SALT_LENGTH)
  const hash = createHash('sha256')
  hash.update(salt)
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash.update(token)
  }
  return `${salt.toString('hex')}:${hash.digest('hex')}`
}

// Mirrors route.ts token generation
function generateToken() {
  return `amp_${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`
}

const BASE = 'http://localhost:3000'
const TEST_EMAIL = `test-${Date.now()}@amplify-test.local`
const TEST_PASSWORD = 'TestPass123!@#'

console.log('=== Test: Create API Key → key_prefix saved ===\n')

// 1. Create test user
console.log(`Creating test user: ${TEST_EMAIL}`)
const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  email_confirm: true
})

if (createErr) {
  console.error('Failed to create user:', createErr.message)
  process.exit(1)
}

const userId = userData.user.id
console.log(`User created: ${userId}\n`)

// 2. Generate token (same logic as route.ts POST handler)
const newToken = generateToken()
const tokenHash = hashToken(newToken)
const keyPrefix = newToken.slice(0, KEY_PREFIX_LENGTH)

console.log('Generated token:', newToken.slice(0, 16) + '...')
console.log('Expected prefix:', keyPrefix)
console.log('Hash length:', tokenHash.length, '(expected 97)\n')

// 3. Insert into api_keys (same as route.ts)
const { error: insertErr } = await supabaseAdmin.from('api_keys').insert({
  user_id: userId,
  name: 'Chrome Extension',
  key_hash: tokenHash,
  key_prefix: keyPrefix
})

if (insertErr) {
  console.error('Insert failed:', insertErr.message)
  await supabaseAdmin.auth.admin.deleteUser(userId)
  process.exit(1)
}

console.log('Key inserted into api_keys table.\n')

// 4. Verify DB state
const { data: stored, error: queryErr } = await supabaseAdmin
  .from('api_keys')
  .select('*')
  .eq('user_id', userId)
  .single()

if (queryErr || !stored) {
  console.error('Query failed:', queryErr?.message)
  process.exit(1)
}

console.log('=== DB Verification ===')
console.log(`  Stored key_prefix: "${stored.key_prefix}"`)
console.log(`  Expected:          "${keyPrefix}"`)
console.log(`  Match: ${stored.key_prefix === keyPrefix ? 'YES' : 'NO'}`)
console.log(`  Hash format: ${stored.key_hash.includes(':') ? 'salt:hash (correct)' : 'MALFORMED'}`)
console.log(`  Hash length: ${stored.key_hash.length} (expected 97)\n`)

const prefixOK = stored.key_prefix === keyPrefix
const hashOK = stored.key_hash.includes(':') && stored.key_hash.length === 97

if (!prefixOK || !hashOK) {
  console.log('FAIL: Key not stored correctly')
  await supabaseAdmin.from('api_keys').delete().eq('user_id', userId)
  await supabaseAdmin.auth.admin.deleteUser(userId)
  process.exit(1)
}

// 5. Test that this key works against /api/extension/status
console.log('Testing /api/extension/status with new key...')
const statusRes = await fetch(`${BASE}/api/extension/status`, {
  headers: { 'Authorization': `Bearer ${newToken}` }
})

console.log('Status response:', statusRes.status)
const statusBody = await statusRes.json()
console.log('Body:', JSON.stringify(statusBody, null, 2))

const authWorks = statusRes.status === 200 && statusBody.user_id === userId
console.log(`\nAuth result: ${authWorks ? 'PASS — key authenticates correctly' : 'FAIL — see above'}`)

// 6. Test legacy key fallback (create key WITHOUT prefix, try to auth)
//    This simulates pre-migration keys
console.log('\n=== Bonus: Test legacy key fallback ===')
const legacyToken = generateToken()
const legacyHash = hashToken(legacyToken)
const { error: legacyErr } = await supabaseAdmin.from('api_keys').insert({
  user_id: userId,
  name: 'Legacy Test',
  key_hash: legacyHash,
  key_prefix: ''  // Empty prefix = legacy path
})

if (!legacyErr) {
  console.log('Created legacy key (empty prefix)')
  const legacyRes = await fetch(`${BASE}/api/extension/status`, {
    headers: { 'Authorization': `Bearer ${legacyToken}` }
  })
  console.log('Legacy auth result:', legacyRes.status, legacyRes.status === 200 ? '(PASS)' : '(FAIL)')
  if (legacyRes.status === 200) {
    const lb = await legacyRes.json()
    console.log('Legacy user_id:', lb.user_id, lb.user_id === userId ? '(matches)' : '(MISMATCH)')
  }
}

// Cleanup
console.log('\nCleanup: deleting test user + keys...')
await supabaseAdmin.from('api_keys').delete().eq('user_id', userId)
await supabaseAdmin.auth.admin.deleteUser(userId)
console.log('Done.')

console.log(`\n=== Final Result: ${authWorks ? 'PASS' : 'FAIL'} ===`)
console.log('  ✓ key_prefix stored correctly')
console.log(`  ✓ /status endpoint auth via prefix lookup: ${authWorks ? 'works' : 'FAILED'}`)
process.exit(authWorks ? 0 : 1)
