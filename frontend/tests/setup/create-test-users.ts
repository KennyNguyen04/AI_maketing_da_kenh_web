/**
 * Setup test users trong Supabase cho E2E testing.
 *
 * Usage:
 *   1. Dien .env.test.local (copy tu .env.test.local.example)
 *   2. cd frontend && npx tsx tests/setup/create-test-users.ts
 *
 * Script se:
 *   - Tao 2 user (user thuong + admin) trong Supabase auth
 *   - Seed 1 vault cho user thuong (clean state)
 *   - Skip neu user da ton tai (idempotent)
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - E2E_TEST_EMAIL, E2E_TEST_PASSWORD
 *   - E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEST_EMAIL = process.env.E2E_TEST_EMAIL
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD

function assertEnv(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`Missing required env var: ${name}`)
    console.error('Copy .env.test.local.example -> .env.test.local and fill values.')
    process.exit(1)
  }
  return value
}

async function ensureUser(
  supabase: SupabaseClient,
  email: string,
  password: string,
  role: 'user' | 'admin'
): Promise<string> {
  // Check if user exists
  const { data: listData } = await supabase.auth.admin.listUsers()
  const existing = listData?.users?.find((u) => u.email === email)

  if (existing) {
    console.log(`  [skip] ${email} da ton tai (id: ${existing.id})`)
    return existing.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email confirmation
    user_metadata: { role },
  })

  if (error || !data.user) {
    console.error(`  [fail] Tao ${email} that bai:`, error?.message ?? 'unknown')
    process.exit(1)
  }

  console.log(`  [ok]   ${email} da tao (id: ${data.user.id}, role: ${role})`)
  return data.user.id
}

async function seedVault(
  supabase: SupabaseClient,
  userId: string,
  vaultName: string
): Promise<void> {
  // Check if vault exists
  const { data: existing } = await supabase
    .from('vaults')
    .select('id')
    .eq('user_id', userId)
    .eq('name', vaultName)
    .maybeSingle()

  if (existing) {
    console.log(`  [skip] Vault "${vaultName}" da ton tai`)
    return
  }

  const { error } = await supabase.from('vaults').insert({
    user_id: userId,
    name: vaultName,
    system_prompt:
      'You are a test brand voice. Write concise, professional content for QA testing.',
    topics: ['Testing', 'QA', 'Automation'],
    audience: 'QA engineers and developers',
    sample_sentences: ['This is a test sentence for sample.', 'Another sample for testing.'],
    is_active: true,
  })

  if (error) {
    console.error(`  [fail] Seed vault that bai:`, error.message)
    return
  }

  console.log(`  [ok]   Vault "${vaultName}" da seed`)
}

async function main() {
  console.log('=== Amplify MVP - Test User Setup ===\n')

  // Validate env
  assertEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL)
  assertEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY)
  assertEnv('E2E_TEST_EMAIL', TEST_EMAIL)
  assertEnv('E2E_TEST_PASSWORD', TEST_PASSWORD)
  assertEnv('E2E_ADMIN_EMAIL', ADMIN_EMAIL)
  assertEnv('E2E_ADMIN_PASSWORD', ADMIN_PASSWORD)

  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('Tao test users...')
  const userId = await ensureUser(supabase, TEST_EMAIL!, TEST_PASSWORD!, 'user')
  await ensureUser(supabase, ADMIN_EMAIL!, ADMIN_PASSWORD!, 'admin')

  console.log('\nSeed vault cho user test...')
  await seedVault(supabase, userId, 'Test Vault (E2E)')

  console.log('\n=== Setup hoan tat ===')
  console.log('Ban co the chay E2E tests:')
  console.log('  cd frontend && npx playwright test --project=chromium')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})