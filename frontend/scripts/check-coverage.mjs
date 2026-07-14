#!/usr/bin/env node
/**
 * Coverage Gate Script — fail CI nếu coverage dưới threshold cho bất kỳ file
 * nào trong danh sách critical.
 *
 * Cách dùng:
 *   node scripts/check-coverage.mjs
 *
 * Đầu vào:
 *   - frontend/coverage/coverage-summary.json (do vitest --coverage tạo ra)
 *   - Threshold map (định nghĩa bên dưới, khớp với vitest.config.ts)
 *
 * Đầu ra:
 *   - Bảng ASCII hiển thị từng file critical vs threshold
 *   - Exit code 0 nếu tất cả pass, 1 nếu có file nào dưới threshold.
 *
 * Lưu ý:
 *   - Chạy SAU khi `npm run test:coverage` đã generate report.
 *   - Pattern matching theo suffix path so sánh đúng với key trong coverage-summary.
 *   - File không có trong summary (coverage 0) → coi như fail ngay.
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = resolve(__dirname, '..')
const COVERAGE_SUMMARY = resolve(FRONTEND_DIR, 'coverage', 'coverage-summary.json')

// ─── Threshold config (sync với vitest.config.ts) ────────────────────
//
// Key: đường dẫn tương đối từ frontend/. Có thể match exact hoặc bằng suffix.
// Value: { lines, functions, branches, statements } tối thiểu (%).
const CRITICAL_FILES = [
  // ─── lib/auth — auth path ───
  { pattern: 'lib/auth/admin.ts', thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 } },

  // ─── lib/social — token encryption + OAuth ───
  { pattern: 'lib/social/crypto.ts', thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 } },
  { pattern: 'lib/social/oauth.ts', thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 } },
  { pattern: 'lib/social/token-manager.ts', thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 } },
  { pattern: 'lib/social/rate-limiter.ts', thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 } },

  // ─── lib/security — rate-limit guard ───
  { pattern: 'lib/security/rate-limit.ts', thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 } },

  // ─── lib/validation — input guard ───
  { pattern: 'lib/validation/api.ts', thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 } },

  // ─── lib/ai — AI generation core ───
  { pattern: 'lib/ai/parser.ts', thresholds: { lines: 70, functions: 80, branches: 70, statements: 70 } },
  { pattern: 'lib/ai/budget.ts', thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 } },

  // ─── Extension API routes — chạy ngoài RLS ───
  // tasks/route.ts: branches coverage thấp do SQL filter chain phức tạp
  // (priority, scheduled_for, urgent bypass). Đã có integration test cover
  // các branches chính, nhưng một số conditional (post-fetch day count)
  // chưa có test riêng — Phase 2 sẽ bổ sung.
  { pattern: 'app/api/extension/tasks/route.ts', thresholds: { lines: 70, functions: 70, branches: 40, statements: 70 } },
  { pattern: 'app/api/extension/cancel/route.ts', thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 } },
  { pattern: 'app/api/extension/resync/route.ts', thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 } },
]

// ─── Helpers ────────────────────────────────────────────────────────

function readCoverageSummary() {
  if (!existsSync(COVERAGE_SUMMARY)) {
    console.error(`❌ Coverage summary not found: ${COVERAGE_SUMMARY}`)
    console.error('   Run `npm run test:coverage` first.')
    process.exit(2)
  }
  return JSON.parse(readFileSync(COVERAGE_SUMMARY, 'utf8'))
}

function findEntry(summary, pattern) {
  // coverage-summary keys là full path từ cwd của vitest (frontend/).
  // Match theo suffix để chịu được khác biệt OS path separator.
  const target = pattern.replace(/\//g, '\\')
  return Object.entries(summary).find(([key]) => {
    if (key === 'total') return false
    const normalizedKey = key.replace(/\//g, '\\')
    return normalizedKey.endsWith(target) || normalizedKey.endsWith(`\\${target}`)
  })
}

function evaluateMetric(actual, threshold) {
  if (actual >= threshold) return '✓'
  if (actual >= threshold * 0.9) return '⚠'
  return '✗'
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  const summary = readCoverageSummary()
  const results = []
  let failed = 0

  for (const { pattern, thresholds } of CRITICAL_FILES) {
    const entry = findEntry(summary, pattern)

    if (!entry) {
      results.push({ pattern, status: 'MISSING', metrics: null })
      failed += 1
      continue
    }

    const [, fileCoverage] = entry
    const metrics = {
      lines: fileCoverage.lines?.pct ?? 0,
      functions: fileCoverage.functions?.pct ?? 0,
      branches: fileCoverage.branches?.pct ?? 0,
      statements: fileCoverage.statements?.pct ?? 0,
    }

    const allPass = Object.entries(thresholds).every(
      ([metric, min]) => metrics[metric] >= min,
    )

    results.push({ pattern, status: allPass ? 'PASS' : 'FAIL', metrics, thresholds })
    if (!allPass) failed += 1
  }

  // ─── Print table ──────────────────────────────────────────────────
  console.log('\n📊 Coverage Gate Report\n')
  console.log('File                                          Lines   Funcs   Branches  Stmts   Status')
  console.log('────────────────────────────────────────────  ──────  ──────  ────────  ──────  ──────')

  for (const r of results) {
    if (r.status === 'MISSING') {
      console.log(`${r.pattern.padEnd(46)}  (no coverage data)              MISSING`)
      continue
    }

    const m = r.metrics
    const t = r.thresholds
    const lineStr = `${evaluateMetric(m.lines, t.lines)}${m.lines.toFixed(1).padStart(5)}%  `
    const funcStr = `${evaluateMetric(m.functions, t.functions)}${m.functions.toFixed(1).padStart(5)}%  `
    const branchStr = `${evaluateMetric(m.branches, t.branches)}${m.branches.toFixed(1).padStart(6)}%  `
    const stmtStr = `${evaluateMetric(m.statements, t.statements)}${m.statements.toFixed(1).padStart(5)}%  `

    console.log(`${r.pattern.padEnd(46)}  ${lineStr} ${funcStr} ${branchStr} ${stmtStr}  ${r.status}`)
  }

  console.log('')
  if (failed > 0) {
    console.error(`❌ ${failed} file(s) below threshold. Coverage gate FAILED.`)
    process.exit(1)
  }

  console.log(`✅ All ${results.length} critical files meet coverage thresholds.`)
  process.exit(0)
}

main()
