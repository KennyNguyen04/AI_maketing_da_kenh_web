/**
 * Global Setup — loaded once per test file via `vitest.config.ts → setupFiles`.
 *
 * Nhiệm vụ:
 *  1. Tự động load @testing-library/jest-dom (nếu đã cài) — cung cấp các matcher
 *     tiện lợi như toBeInTheDocument(), toHaveTextContent(), toBeVisible().
 *  2. Đảm bảo fake timers / mocks được reset giữa các test để tránh cross-contamination.
 *  3. Suppress console.error cho các test cố tình trigger error path (tránh noise).
 *  4. Cung cấp default timeout phù hợp cho async DB / API tests.
 *
 * Best practice: file này chỉ setup/teardown infrastructure, KHÔNG định nghĩa
 * test nào. Tests đặt trong các file *.test.ts riêng.
 */

import { afterEach, beforeEach, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

// ─── 1. Optional @testing-library/jest-dom ──────────────────────────
//
// Nếu package chưa được cài (hiện tại devDeps chưa có), skip silently.
// Sau khi `npm install -D @testing-library/jest-dom`, file sẽ tự động load
// mà không cần thay đổi code.
//
// Cú pháp: dùng `createRequire` (CommonJS-style) kết hợp với require.resolve
// để check existence trước khi import — tránh vite import-analysis throw lỗi
// resolution khi package chưa có.
const require = createRequire(import.meta.url)
function tryLoadJestDom() {
  try {
    const resolved = require.resolve('@testing-library/jest-dom/vitest')
    if (existsSync(resolved)) {
      // require() vì đã verify path tồn tại
      require(resolved)
      return true
    }
  } catch {
    // Package not installed. Run `npm install -D @testing-library/jest-dom` to enable
    // DOM matchers like expect(el).toBeInTheDocument().
  }
  return false
}
tryLoadJestDom()

// ─── 2. Clear all mocks between tests ──────────────────────────────
//
// Mặc định vitest clear mocks khi `clearMocks: true` trong config, nhưng ta
// cũng reset fake timers + fake dates để test nào không lệ thuộc test trước.
beforeEach(() => {
  vi.useRealTimers()
})

afterEach(() => {
  // Reset fake timers (nếu test nào đó dùng vi.useFakeTimers)
  vi.useRealTimers()
  // Reset Date mock nếu test nào override
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
})

// ─── 3. Suppress noisy console.error ────────────────────────────────
//
// Một số test cố tình trigger error path (catch block). Console.error từ
// production code sẽ in ra rất nhiều, gây khó đọc test output. Đoạn này
// filter ra các message "expected" mà test đã biết.
const originalError = console.error
const expectedErrorPatterns = [
  /^Auth session missing!/,
  /^Missing Supabase env vars/,
  /^Token hết hạn/,
  /Token refresh failed for/,
  /Facebook token exchange failed/,
  /rpc failed/,
]

beforeEach(() => {
  console.error = (...args: unknown[]) => {
    const first = args[0]
    if (typeof first === 'string') {
      for (const pattern of expectedErrorPatterns) {
        if (pattern.test(first)) return
      }
    }
    originalError(...args)
  }
})

afterEach(() => {
  console.error = originalError
})

// ─── 4. Set sensible default timeout ────────────────────────────────
//
// Default vitest timeout là 5s. Một số async test (network, DB) có thể cần
// hơn. Override ở đây để apply cho mọi test trong file (không phải từng test).
vi.setConfig?.({
  testTimeout: 10_000,
  hookTimeout: 10_000,
})
