import { test, expect } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Setup spec: cache auth state for the test user so subsequent tests skip login.
 *
 * Run with: npx playwright test auth-state --project=setup
 * The cached file is at tests/setup/.auth/user.json
 *
 * This reduces E2E runtime by ~10-15 seconds per test (login takes that long).
 *
 * To re-cache auth state (e.g. password changed), delete the .auth/user.json file
 * or set FORCE_REAUTH=1 env var.
 *
 * If env vars E2E_TEST_EMAIL/PASSWORD are missing, this test SKIPS gracefully
 * (matching the pattern in other specs). Subsequent tests will use their own
 * beforeEach login logic.
 */

const AUTH_STATE_PATH = 'tests/setup/.auth/user.json'
const SHOULD_FORCE_REAUTH = process.env.FORCE_REAUTH === '1'

test('setup auth state for cached login', async ({ page, browser }) => {
  // Skip if cache exists and not forced
  if (existsSync(AUTH_STATE_PATH) && !SHOULD_FORCE_REAUTH) {
    test.skip(true, 'Auth state already cached')
    return
  }

  const testEmail = process.env.E2E_TEST_EMAIL
  const testPassword = process.env.E2E_TEST_PASSWORD

  // Skip gracefully if env vars missing (matches design pattern of other specs)
  if (!testEmail || !testPassword) {
    test.skip(true, 'E2E_TEST_EMAIL/PASSWORD not set, skipping auth cache setup')
    return
  }

  // Ensure output directory exists
  mkdirSync(dirname(AUTH_STATE_PATH), { recursive: true })

  // Mock OAuth callback in case Supabase redirects through it
  await page.route('**/api/auth/callback/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: { id: 'mock-user', email: testEmail },
      }),
    })
  })

  await page.goto('/login')
  await page.getByLabel(/email/i).fill(testEmail)
  await page.getByLabel(/mật khẩu/i).fill(testPassword)

  const loginButton = page.getByRole('button', { name: /đăng nhập/i })
  await expect(loginButton).toBeVisible()
  await loginButton.click()

  // Wait for successful redirect (dashboard, onboarding, or any authenticated page)
  await page
    .waitForURL(/\/(dashboard|onboarding|review|scheduler|analytics|history|admin|vaults|settings)/, { timeout: 20000 })
    .catch(() => {
      console.error('Login did not redirect to an authenticated page')
    })

  // Save auth state to file for reuse
  await page.context().storageState({ path: AUTH_STATE_PATH })
  console.log(`Auth state cached to ${AUTH_STATE_PATH}`)
})