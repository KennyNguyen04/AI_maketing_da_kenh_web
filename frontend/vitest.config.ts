import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Run both unit tests (lib/) and integration tests (tests/integration/).
    // E2E tests under tests/e2e are handled by Playwright, not Vitest.
    include: [
      'lib/**/*.test.ts',
      'lib/**/*.test.tsx',
      'features/scheduler/*.test.ts',
      'tests/integration/**/*.test.ts',
      // Mirror tests for extension/lib/* helpers live in tests/extension/
      // so vitest (cwd = frontend/) can discover them with a simple glob.
      'tests/extension/**/*.test.ts',
    ],
    exclude: ['node_modules', '.next', 'tests/e2e'],
    // Global setup loads jest-dom matchers (when available), clears timers,
    // and silences expected error patterns. See tests/setup/global-setup.ts.
    setupFiles: ['./tests/setup/global-setup.ts'],
    // Clear all mocks between tests by default — individual tests can opt-out
    // with vi.clearAllMocks() if they want to keep state.
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      // Coverage gate applies to critical paths only. Run
      // `node scripts/check-coverage.mjs` after `npm run test:coverage` to
      // enforce per-file thresholds (see scripts/check-coverage.mjs).
      //
      // Files here MUST stay in sync with CRITICAL_FILES in that script.
      include: [
        // ─── lib/auth ───
        'lib/auth/admin.ts',
        // ─── lib/social — token encryption + OAuth + rate-limiter ───
        'lib/social/crypto.ts',
        'lib/social/oauth.ts',
        'lib/social/token-manager.ts',
        'lib/social/rate-limiter.ts',
        // ─── lib/security — auth guard ───
        'lib/security/rate-limit.ts',
        // ─── lib/validation — input guard ───
        'lib/validation/api.ts',
        // ─── lib/ai — AI generation core ───
        'lib/ai/parser.ts',
        'lib/ai/budget.ts',
        // ─── Extension API routes — bypass RLS via service role ───
        'app/api/extension/tasks/route.ts',
        'app/api/extension/cancel/route.ts',
        'app/api/extension/resync/route.ts',
      ],
      // Global thresholds kept lenient (apply across all files in `include`).
      // Per-file stricter thresholds enforced by check-coverage.mjs.
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
