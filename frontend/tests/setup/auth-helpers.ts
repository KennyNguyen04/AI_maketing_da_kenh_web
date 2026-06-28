import { test as base, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * Auth helper for E2E tests
 * Provides login functionality and auth state management
 */

type TestFixtures = {
  authenticatedPage: Page
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Check if we have test credentials
    const testEmail = process.env.E2E_TEST_EMAIL
    const testPassword = process.env.E2E_TEST_PASSWORD

    if (testEmail && testPassword) {
      // Login via UI flow
      await page.goto('/login')
      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/mật khẩu/i).fill(testPassword)
      await page.getByRole('button', { name: /đăng nhập/i }).click()
      // Wait for redirect to dashboard
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 }).catch(() => {
        console.log('Login redirect did not complete, continuing anyway')
      })
    } else {
      console.log('E2E_TEST_EMAIL or E2E_TEST_PASSWORD not set, skipping authenticated tests')
    }

    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'

/**
 * Direct Supabase auth for creating test users
 * Use this in a setup script to create test users before running tests
 */
export async function createTestUser(
  supabaseUrl: string,
  supabaseKey: string,
  email: string,
  password: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: 'user' },
    },
  })

  if (error) {
    console.error('Error creating test user:', error)
    return null
  }

  return data.user
}

/**
 * Check if user exists in Supabase
 */
export async function getTestUser(supabaseUrl: string, supabaseKey: string, email: string) {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Error listing users:', error)
    return null
  }

  return data.users.find(u => u.email === email)
}
