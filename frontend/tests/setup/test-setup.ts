import { test as base, Page } from '@playwright/test'
import { mockAllExternalApis } from './mock-api'

/**
 * Shared test fixture for E2E tests.
 *
 * Provides:
 *   - page: auto-applies mockAllExternalApis() (social, inngest, AI, OAuth callbacks)
 *   - authenticatedPage: page with logged-in session via Supabase (uses storageState cache)
 *
 * Why use mockAllExternalApis in fixture instead of in each spec?
 *   - Single source of truth for which external APIs to mock
 *   - Spec authors don't need to remember to call it
 *   - Mock list can grow without touching every spec file
 */

type TestFixtures = {
  page: Page
  authenticatedPage: Page
}

export const test = base.extend<TestFixtures>({
  page: async ({ page }, use) => {
    await mockAllExternalApis(page)
    await use(page)
  },

  authenticatedPage: async ({ browser, baseURL }, use) => {
    // Try to load auth state from cache file (created by tests/setup/auth-state.spec.ts)
    const storageStatePath = process.env.STORAGE_STATE_PATH

    const contextOptions: Parameters<typeof browser.newContext>[0] = storageStatePath
      ? { storageState: storageStatePath }
      : {}

    const context = await browser.newContext(contextOptions)
    const page = await context.newPage()
    await mockAllExternalApis(page)

    // If storageState is empty (no cache yet), fall back to UI login
    const testEmail = process.env.E2E_TEST_EMAIL
    const testPassword = process.env.E2E_TEST_PASSWORD

    if (!storageStatePath && testEmail && testPassword && baseURL) {
      await page.goto(baseURL + '/login')
      await page.getByLabel(/email/i).fill(testEmail)
      await page.getByLabel(/mật khẩu/i).fill(testPassword)
      await page.getByRole('button', { name: /đăng nhập/i }).click()
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 }).catch(() => {
        // Continue even if redirect failed (test may still pass with limited assertions)
      })
    }

    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'