/**
 * Bước 1: Verify migration 010 trên Supabase DB
 *
 * Uses Supabase REST API (service role key) to:
 * 1. Query information_schema to confirm key_prefix column exists
 * 2. List all api_keys to verify legacy vs new keys
 *
 * Note: pg_indexes cannot be queried via REST directly.
 * Index verification is marked as MANUAL (run in SQL Editor).
 */

import { supabaseAdmin } from './setup.mjs'

const checks = []
let allPass = true

function record(name, pass, detail) {
  checks.push({ name, pass, detail })
  if (pass === false) allPass = false
}

console.log('=== Verify Migration 010 ===\n')

// 1. Query api_keys to confirm key_prefix column exists & read data
const { data: keys, error: keysErr } = await supabaseAdmin
  .from('api_keys')
  .select('id, user_id, name, key_prefix, key_hash, created_at')
  .order('created_at', { ascending: false })
  .limit(20)

if (keysErr) {
  record('Read api_keys table', false, keysErr.message)
} else {
  // If table is empty, we cannot infer column existence from data alone
  if (keys.length === 0) {
    console.log('  api_keys table is EMPTY (cannot infer schema from data)')
    record('key_prefix column', null,
      'Table empty — verify in SQL Editor: SELECT column_name FROM information_schema.columns WHERE table_name=\'api_keys\' AND column_name=\'key_prefix\';')
  } else {
    const sample = keys[0]
    const hasColumn = 'key_prefix' in sample
    record('key_prefix column', hasColumn,
      hasColumn ? 'Column present in api_keys' : 'Column MISSING — run migration 010')
  }

  console.log('\n=== API Keys (latest 20) ===')
  console.log(`Total: ${keys.length}`)
  for (const k of keys) {
    const prefix = !k.key_prefix ? '(empty - legacy)' : k.key_prefix
    const hashLen = k.key_hash?.length || 0
    console.log(`  [${k.name}] prefix=${prefix} hash_len=${hashLen} created=${k.created_at}`)
  }

  const legacy = keys.filter(k => !k.key_prefix).length
  const newKeys = keys.filter(k => k.key_prefix).length
  console.log(`\n  Legacy keys (empty prefix): ${legacy}`)
  console.log(`  New keys (with prefix): ${newKeys}`)

  // Detect malformed hashes (not in 'salt:hash' format expected by hashToken)
  const malformed = keys.filter(k => !k.key_hash?.includes(':'))
  if (malformed.length > 0) {
    console.log(`\n  WARNING: ${malformed.length} key(s) have non-standard hash format.`)
    console.log('  These were NOT created by current hashToken() implementation.')
    console.log('  They will fail verification in findKeyByToken (no colon separator).')
    console.log('  ACTION: Delete these keys via UI or: DELETE FROM api_keys WHERE id IN (...);')
  }
}

// 2. Index check requires raw SQL — mark as manual
record('idx_api_keys_prefix index', null,
  'Verify in SQL Editor: SELECT indexname FROM pg_indexes WHERE indexname = \'idx_api_keys_prefix\';')

console.log('\n=== Verification Results ===')
for (const c of checks) {
  const status = c.pass === true ? 'PASS' : c.pass === false ? 'FAIL' : 'MANUAL'
  console.log(`[${status}] ${c.name}`)
  console.log(`         ${c.detail}`)
}

console.log('\n=== Manual SQL Verification ===')
console.log('Run these in Supabase SQL Editor to fully verify:')
console.log(`
-- 1. Check column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'key_prefix';

-- 2. Check index
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND indexname = 'idx_api_keys_prefix';

-- 3. Inspect all keys
SELECT user_id, name, key_prefix, LENGTH(key_hash) AS hash_len, created_at
FROM public.api_keys ORDER BY created_at DESC LIMIT 20;
`)

console.log('\nExpected results:')
console.log('  1. Returns 1 row: key_prefix | text | YES')
console.log('  2. Returns 1 row: idx_api_keys_prefix | CREATE INDEX ... WHERE key_prefix IS NOT NULL ...')
console.log('  3. New keys (after migration 010) have key_prefix like "amp_xxx..."')
console.log('     Legacy keys have key_prefix = "" (empty string)')

process.exit(allPass ? 0 : 1)
