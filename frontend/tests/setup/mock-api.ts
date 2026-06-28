import { Page } from '@playwright/test'

/**
 * Mock social publishing APIs to avoid real API calls during E2E tests
 */
export async function mockSocialApis(page: Page): Promise<void> {
  await page.route('**/api/publish/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Published (mocked)',
        publishId: `mock-publish-${Date.now()}`,
      }),
    })
  })

  await page.route('**/api/social/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Social action completed (mocked)',
      }),
    })
  })

  await page.route('**/api/schedule/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Scheduled (mocked)',
      }),
    })
  })
}

/**
 * Mock Inngest webhook endpoints
 */
export async function mockInngestApis(page: Page): Promise<void> {
  await page.route('**/api/inngest/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })
}

/**
 * Mock AI content generation
 */
export async function mockAIApis(page: Page): Promise<void> {
  await page.route('**/api/jobs/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/api/jobs')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          jobId: `mock-job-${Date.now()}`,
        }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock all external APIs for E2E testing
 */
export async function mockAllExternalApis(page: Page): Promise<void> {
  await mockSocialApis(page)
  await mockInngestApis(page)
  await mockAIApis(page)

  // Mock Google OAuth
  await page.route('**/api/auth/callback/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: { id: 'mock-user', email: 'test@example.com' },
      }),
    })
  })
}
