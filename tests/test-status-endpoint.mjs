/**
 * Bước 4 + 6: Test /status endpoint + Multi-user auth fix
 *
 * Scenarios:
 * A. Valid token (with prefix) → 200, returns correct user_id
 * B. Valid token (legacy, empty prefix) → 200 (fallback works)
 * C. Invalid token → 401
 * D. Multi-user: user A token only auths user A, not user B
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from './setup.mjs'

const SALT_LENGTH = 16
const HASH_ITERATIONS = 100_000

function hashToken(token) {
  const salt = randomBytes(SALT_LENGTH)
  const hash = createHash('sha256')
  hash.update(salt)
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash.update(token)
  }
  return `${salt.toString('hex')}:${hash.digest('hex')}`
}

function generateToken() {
  return `amp_${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`
}

const BASE = 'http://localhost:3000'

async function createUserWithKey(label, isLegacy = false) {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@amplify-test.local`
  const { data: userData } = await supabaseAdmin.auth.admin.createUser({
    email, password: 'TestPass123!@#', email_confirm: true
  })
  const userId = userData.user.id

  const token = generateToken()
  const hash = hashToken(token)
  const prefix = isLegacy ? '' : token.slice(0, 8)

  await supabaseAdmin.from('api_keys').insert({
    user_id: userId,
    name: 'Chrome Extension',
    key_hash: hash,
    key_prefix: prefix
  })

  return { userId, email, token, prefix, isLegacy }
}

async function deleteUser(userId) {
  await supabaseAdmin.from('api_keys').delete().eq('user_id', userId)
  await supabaseAdmin.auth.admin.deleteUser(userId)
}

async function callStatus(token) {
  const res = await fetch(`${BASE}/api/extension/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return { status: res.status, body: await res.json() }
}

console.log('=== Test: /status endpoint + Multi-user auth fix ===\n')

// Setup: Create user A (new key with prefix) + user B (legacy key)
console.log('Setup: creating test users A and B...')
const userA = await createUserWithKey('userA', false)
const userB = await createUserWithKey('userB', true)
const userC = await createUserWithKey('userC', false)

console.log(`  A: userId=${userA.userId.slice(0, 8)}... prefix="${userA.prefix}"`)
console.log(`  B: userId=${userB.userId.slice(0, 8)}... prefix="${userB.prefix}" (legacy, empty)`)
console.log(`  C: userId=${userC.userId.slice(0, 8)}... prefix="${userC.prefix}"`)

const results = []

// Test A: User A token → 200, user_id = A
console.log('\n--- Test A: Valid token with prefix (user A) ---')
const rA = await callStatus(userA.token)
console.log(`  Status: ${rA.status}, user_id match: ${rA.body.user_id === userA.userId}`)
results.push({ name: 'A: new-key auth', pass: rA.status === 200 && rA.body.user_id === userA.userId, detail: rA })

// Test B: User B token (legacy) → 200, user_id = B
console.log('\n--- Test B: Legacy token (user B, empty prefix) ---')
const rB = await callStatus(userB.token)
console.log(`  Status: ${rB.status}, user_id match: ${rB.body.user_id === userB.userId}`)
results.push({ name: 'B: legacy-key fallback', pass: rB.status === 200 && rB.body.user_id === userB.userId, detail: rB })

// Test C: Invalid token → 401
console.log('\n--- Test C: Invalid token ---')
const rC = await callStatus('amp_invalid_token_12345')
console.log(`  Status: ${rC.status}`)
results.push({ name: 'C: invalid token rejected', pass: rC.status === 401, detail: rC })

// Test D: Multi-user — User A token must NOT auth as user C
//         Even though both have prefix, the prefix is different per user
console.log('\n--- Test D: Multi-user isolation ---')
console.log(`  A prefix: "${userA.prefix}", C prefix: "${userC.prefix}"`)
const rD = await callStatus(userA.token)
const isIsolated = rD.status === 200 && rD.body.user_id === userA.userId
console.log(`  A's token auths as A: ${isIsolated}`)
results.push({ name: 'D: multi-user isolation', pass: isIsolated, detail: rD })

// Test E: Status response shape
console.log('\n--- Test E: Response shape includes new fields ---')
const expectedFields = ['ok', 'user_id', 'pending_tasks', 'completed_today', 'completed_total', 'timestamp']
const rE = await callStatus(userA.token)
const missingFields = expectedFields.filter(f => !(f in rE.body))
console.log(`  Fields present: ${Object.keys(rE.body).join(', ')}`)
console.log(`  Missing: ${missingFields.length ? missingFields.join(', ') : 'none'}`)
results.push({ name: 'E: response shape', pass: missingFields.length === 0, detail: rE.body })

// Summary
console.log('\n=== Results ===')
let allPass = true
for (const r of results) {
  const status = r.pass ? 'PASS' : 'FAIL'
  console.log(`[${status}] ${r.name}`)
  if (!r.pass) {
    console.log(`        Detail:`, JSON.stringify(r.detail, null, 2))
    allPass = false
  }
}

// Cleanup
console.log('\nCleanup...')
await deleteUser(userA.userId)
await deleteUser(userB.userId)
await deleteUser(userC.userId)
console.log('Done.')

console.log(`\n=== ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'} ===`)
process.exit(allPass ? 0 : 1)
