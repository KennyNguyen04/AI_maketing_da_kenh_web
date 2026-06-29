import { test, expect } from '../setup/test-setup'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('landing page loads correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Amplify/i)
    await expect(page.getByRole('link', { name: /đăng nhập/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /bắt đầu/i })).toBeVisible()
  })

  test('can navigate to login page directly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    // Login page has only one password field
    await expect(page.getByLabel(/mật khẩu/i)).toBeVisible()
  })

  test('can navigate to register page directly', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    // Register page has two password fields - use first one
    await expect(page.getByLabel(/mật khẩu/i).first()).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/mật khẩu/i).fill('wrongpassword123')
    await page.getByRole('button', { name: /đăng nhập/i }).click()
    await expect(page.locator('.bg-sunset-orange\\/10')).toBeVisible({ timeout: 10000 })
  })

  test('register form has all required fields', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/mật khẩu/i).first()).toBeVisible()
    await expect(page.getByLabel(/xác nhận/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /tạo tài khoản/i })).toBeVisible()
  })
})
