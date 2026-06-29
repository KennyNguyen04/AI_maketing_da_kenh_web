import { defineConfig, devices } from '@playwright/test'

const STORAGE_STATE_PATH = 'tests/setup/.auth/user.json'

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/lib/**'], // Ignore Vitest unit tests

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    storageState: { cookies: [], origins: [] }, // Empty by default; tests use their own beforeEach login
  },

  projects: [
    // Setup project: runs auth-state.spec.ts first to populate cache
    {
      name: 'setup',
      testMatch: 'auth-state.spec.ts',
      use: { storageState: { cookies: [], origins: [] } }, // Empty state, will populate via auth-state.spec.ts
    },
    // Main test projects: depend on setup
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})