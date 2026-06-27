/**
 * Investigate api_keys table in detail
 */

import { supabaseAdmin } from './setup.mjs'

const { data, error } = await supabaseAdmin
  .from('api_keys')
  .select('*')
  .limit(5)

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log('=== Detailed api_keys dump ===')
for (const k of data || []) {
  console.log('\n--- Row ---')
  console.log('  id:', k.id)
  console.log('  user_id:', k.user_id)
  console.log('  name:', k.name)
  console.log('  key_prefix:', JSON.stringify(k.key_prefix))
  console.log('  key_hash length:', k.key_hash?.length || 0)
  console.log('  key_hash first 50:', k.key_hash?.slice(0, 50))
  console.log('  key_hash last 50:', k.key_hash?.slice(-50))
  console.log('  key_hash format check:')
  if (k.key_hash?.includes(':')) {
    const [salt, hash] = k.key_hash.split(':')
    console.log('    salt length:', salt?.length, 'isHex:', /^[0-9a-f]+$/.test(salt || ''))
    console.log('    hash length:', hash?.length, 'isHex:', /^[0-9a-f]+$/.test(hash || ''))
  } else {
    console.log('    NO COLON — malformed hash!')
  }
  console.log('  last_used_at:', k.last_used_at)
  console.log('  created_at:', k.created_at)
}
