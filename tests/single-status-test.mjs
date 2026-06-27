/**
 * Single-call test: create user + key + test /status
 * Skip cleanup between steps for easier debugging
 */

import { createHash, randomBytes } from 'crypto'
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

const BASE = 'http://localhost:3000'
const TEST_EMAIL = `single-${Date.now()}@amplify-test.local`

console.log('1. Create test user...')
const { data: userData } = await supabaseAdmin.auth.admin.createUser({
  email: TEST_EMAIL,
  password: 'TestPass123!@#',
  email_confirm: true
})
const userId = userData.user.id
console.log('   userId:', userId)

// Persist userId for inspection (skip cleanup at end)
console.log('\n2. Generate and insert key...')
const token = `amp_${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`
const prefix = token.slice(0, 8)
const hash = hashToken(token)
console.log('   Token:', token.slice(0, 24) + '...')
console.log('   Prefix:', prefix)

const { error: insertErr } = await supabaseAdmin.from('api_keys').insert({
  user_id: userId,
  name: 'Chrome Extension',
  key_hash: hash,
  key_prefix: prefix
})
if (insertErr) {
  console.error('Insert error:', insertErr.message)
  process.exit(1)
}
console.log('   Inserted successfully')

console.log('\n3. Verify in DB...')
const { data: rows } = await supabaseAdmin
  .from('api_keys')
  .select('*')
  .eq('user_id', userId)
console.log('   Found rows:', rows?.length)
for (const r of rows || []) {
  console.log('     -', { name: r.name, prefix: r.key_prefix, hash_len: r.key_hash?.length })
}

console.log('\n4. Call /api/extension/status...')
const res = await fetch(`${BASE}/api/extension/status`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
console.log('   HTTP status:', res.status)
const body = await res.json()
console.log('   Body:', JSON.stringify(body, null, 2))

console.log('\n5. Compare user_id from /status...')
if (body.user_id) {
  console.log('   /status user_id:', body.user_id)
  console.log('   Expected user_id:', userId)
  console.log('   Match:', body.user_id === userId)
}

console.log('\n(Not cleaning up for inspection)')
console.log(`Test user: ${TEST_EMAIL}`)
console.log(`Test user_id: ${userId}`)
console.log(`Test token: ${token}`)
