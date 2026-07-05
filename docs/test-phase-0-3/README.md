# Phase 0.3 Test Plan — End-to-end SQL + API verification

## Status as of 2026-07-04

| # | File | Status |
|---|------|--------|
| 1 | `01-verify-view-columns.sql` | ✅ PASS — 4 columns: draft_id, user_id, content, published_at_proxy |
| 2 | `02-check-constraints.sql` | ⚠️ REVISED — original filter returned 1 constraint only; revised file dumps ALL constraints |
| 3 | `03-seed-test-data.sql` | ❌ REVISED — original hit unique key collision; revised handles re-runs |
| 4 | `04-verify-view-and-user.sql` | ✅ PARTIAL — user list returned, but did not yet verify view after seed (depends on Test 3) |
| 5 | `05-cleanup.sql` | ✅ PASS — runs idempotently, ends with `remaining_published = 0` |
| 6 | `06-api-integration-test.sql` | ❌ REVISED — original had SQL syntax error from `$USER_ID`; revised is pure instructions |

## Re-run order (with revised files)

Run Test 2 → 3 → 4 → 6 (steps A→D) → 5 (cleanup).

The revised Test 2 will reveal:
- All `extension_tasks` CHECKs (critical for Phase 1.1 status='cancelled')
- All `drafts` CHECKs
- All `drafts` UNIQUE constraints (so we know which keys to dodge)

The revised Test 3 now self-heals: deletes prior TEST_* rows, computes next version dynamically.

## Critical findings to verify after re-run

- ❗ `extension_tasks.status` CHECK must include `'cancelled'`. If absent, Phase 1.1 will fail at update time.
- ❗ `extension_tasks.channel` CHECK must include `'threads'`, `'instagram'`, `'facebook-group'`. If absent, Phase 1.1/1.2/1.3 routes cannot insert.
- ❗ `extension_tasks.target_type` CHECK must include `'group'`. If absent, Phase 1.3 fails.
- ❗ `drafts.publish_status` CHECK must include `'published'`. If absent, view 019 returns nothing.

## Test 6 requires additional setup

- A real auth user_id (5 available: `e639afc6...`, `fd9acf60...`, `dd8e7ded...`, `03f9a4a7...`, `f7580f6e...`)
- A fresh API key for that user — needs either:
  - `create_api_key_safe` SQL function (check with `SELECT proname FROM pg_proc WHERE proname = 'create_api_key_safe';`)
  - Or the extension UI's "Create API Key" flow
- Frontend dev server on localhost:3000

## Cleanup is mandatory

After all tests, run `05-cleanup.sql` and confirm `remaining_published = 0`.