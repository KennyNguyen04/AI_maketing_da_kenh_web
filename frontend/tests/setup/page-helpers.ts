import { test, expect, Page } from '@playwright/test'

/**
 * Auth helper for protected page tests
 * Attempts to authenticate, but continues even if auth fails
 * (useful for testing UI elements that don't require auth)
 */

interface AuthConfig {
  email: string
  password: string
}

function getAuthConfig(): AuthConfig | null {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD
  if (email && password) {
    return { email, password }
  }
  return null
}

export async function loginUser(page: Page, config: AuthConfig): Promise<boolean> {
  try {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(config.email)
    await page.getByLabel(/mật khẩu/i).fill(config.password)
    await page.getByRole('button', { name: /đăng nhập/i }).click()
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 10000 })
    return true
  } catch {
    return false
  }
}

export function shouldSkipAuthTests(): boolean {
  return !getAuthConfig()
}

export { test, expect }
