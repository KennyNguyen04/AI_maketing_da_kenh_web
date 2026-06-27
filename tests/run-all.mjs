/**
 * Run all tests in sequence
 */

import { spawn } from 'child_process'

const tests = [
  { name: 'verify-migration', script: 'verify-migration.mjs' },
  { name: 'test-key-flow', script: 'test-key-flow.mjs' },
  { name: 'test-status-endpoint', script: 'test-status-endpoint.mjs' },
  { name: 'test-tasks-endpoint', script: 'test-tasks-endpoint.mjs' }
]

console.log('=== Running All Extension Tests ===\n')

for (const t of tests) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Running: ${t.name}`)
  console.log('='.repeat(60))
  await new Promise((resolve) => {
    const child = spawn('node', [t.script], { stdio: 'inherit' })
    child.on('close', (code) => {
      console.log(`\n[${t.name}] exit code: ${code}`)
      resolve()
    })
  })
}

console.log('\n=== All tests completed ===')
console.log('See tests/MANUAL_EXTENSION_TEST.md for Chrome extension manual test steps')
