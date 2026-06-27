/**
 * Bước 5: Test /api/extension/tasks endpoint
 *
 * Verifies:
 * 1. Response shape: { tasks: [...] } not bare array
 * 2. Tasks filtered by pending + scheduled_for <= now
 * 3. Empty when no pending tasks
 * 4. Returns user's own tasks only
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

function generateToken() {
  return `amp_${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`
}

const BASE = 'http://localhost:3000'

async function createUserWithKey() {
  const email = `tasks-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@amplify-test.local`
  const { data: userData } = await supabaseAdmin.auth.admin.createUser({
    email, password: 'TestPass123!@#', email_confirm: true
  })
  const userId = userData.user.id

  const token = generateToken()
  const hash = hashToken(token)
  const prefix = token.slice(0, 8)

  await supabaseAdmin.from('api_keys').insert({
    user_id: userId, name: 'Chrome Extension',
    key_hash: hash, key_prefix: prefix
  })

  return { userId, email, token, prefix }
}

async function cleanup(userId) {
  await supabaseAdmin.from('extension_tasks').delete().eq('user_id', userId)
  await supabaseAdmin.from('api_keys').delete().eq('user_id', userId)
  await supabaseAdmin.auth.admin.deleteUser(userId)
}

async function callTasks(token) {
  const res = await fetch(`${BASE}/api/extension/tasks`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return { status: res.status, body: await res.json() }
}

console.log('=== Test: /api/extension/tasks endpoint ===\n')

const user = await createUserWithKey()
console.log(`Setup: created user ${user.email.slice(0, 30)}...`)
console.log(`  userId=${user.userId.slice(0, 8)}..., token=${user.token.slice(0, 12)}...\n`)

const results = []

// Test 1: Empty state
console.log('--- Test 1: No pending tasks → empty array ---')
const r1 = await callTasks(user.token)
const isEmpty = r1.status === 200 && Array.isArray(r1.body.tasks) && r1.body.tasks.length === 0
console.log(`  Status: ${r1.status}, body:`, JSON.stringify(r1.body))
results.push({ name: '1: empty tasks', pass: isEmpty })

// Test 2: Insert pending task → should appear
console.log('\n--- Test 2: Insert pending task (scheduled now) ---')
const task1Id = crypto.randomUUID()
const { error: insertErr1 } = await supabaseAdmin.from('extension_tasks').insert({
  id: task1Id,
  user_id: user.userId,
  channel: 'facebook',
  content: 'Test pending post',
  scheduled_for: new Date().toISOString(),
  status: 'pending'
})
console.log(`  Inserted task ${task1Id.slice(0, 8)}... (error: ${insertErr1?.message || 'none'})`)

const r2 = await callTasks(user.token)
const hasTask1 = r2.status === 200 && Array.isArray(r2.body.tasks) && r2.body.tasks.length === 1
console.log(`  Status: ${r2.status}, tasks count: ${r2.body.tasks?.length}, contains task1: ${r2.body.tasks?.some(t => t.id === task1Id)}`)
results.push({ name: '2: pending task visible', pass: hasTask1 })

// Test 3: Insert future scheduled task → should NOT appear
console.log('\n--- Test 3: Future scheduled task should not appear ---')
const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
const task2Id = crypto.randomUUID()
await supabaseAdmin.from('extension_tasks').insert({
  id: task2Id,
  user_id: user.userId,
  channel: 'threads',
  content: 'Future post',
  scheduled_for: futureDate,
  status: 'pending'
})

const r3 = await callTasks(user.token)
const hasTask2 = r3.body.tasks?.some(t => t.id === task2Id)
console.log(`  Future task in response: ${hasTask2} (expected: false)`)
results.push({ name: '3: future task hidden', pass: !hasTask2 })

// Test 4: Insert completed task → should NOT appear
console.log('\n--- Test 4: Completed task should not appear ---')
const task3Id = crypto.randomUUID()
await supabaseAdmin.from('extension_tasks').insert({
  id: task3Id,
  user_id: user.userId,
  channel: 'x',
  content: 'Already done',
  scheduled_for: new Date(Date.now() - 60000).toISOString(),
  status: 'completed'
})

const r4 = await callTasks(user.token)
const hasTask3 = r4.body.tasks?.some(t => t.id === task3Id)
console.log(`  Completed task in response: ${hasTask3} (expected: false)`)
results.push({ name: '4: completed task hidden', pass: !hasTask3 })

// Test 5: Other user's task should NOT appear
console.log('\n--- Test 5: Other user\'s task should not appear ---')
const otherUser = await createUserWithKey()
const otherTaskId = crypto.randomUUID()
await supabaseAdmin.from('extension_tasks').insert({
  id: otherTaskId,
  user_id: otherUser.userId,
  channel: 'instagram',
  content: 'Other user post',
  scheduled_for: new Date().toISOString(),
  status: 'pending'
})

const r5 = await callTasks(user.token)
const hasOtherTask = r5.body.tasks?.some(t => t.id === otherTaskId)
console.log(`  Other user's task visible: ${hasOtherTask} (expected: false)`)
console.log(`  Total tasks in response: ${r5.body.tasks?.length} (expected: 1, just task1)`)
results.push({ name: '5: cross-user isolation', pass: !hasOtherTask })

// Test 6: Response shape for extension
console.log('\n--- Test 6: Response shape ---')
const r6 = await callTasks(user.token)
const hasTasksKey = 'tasks' in r6.body
const tasksIsArray = Array.isArray(r6.body.tasks)
console.log(`  Has 'tasks' key: ${hasTasksKey}, is array: ${tasksIsArray}`)
console.log(`  Full body:`, JSON.stringify(r6.body))
results.push({ name: '6: response shape correct', pass: hasTasksKey && tasksIsArray })

// Summary
console.log('\n=== Results ===')
let allPass = true
for (const r of results) {
  const status = r.pass ? 'PASS' : 'FAIL'
  console.log(`[${status}] ${r.name}`)
  if (!r.pass) allPass = false
}

// Cleanup
console.log('\nCleanup...')
await cleanup(user.userId)
await cleanup(otherUser.userId)
console.log('Done.')

console.log(`\n=== ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'} ===`)
process.exit(allPass ? 0 : 1)
