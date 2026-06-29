# Changelog

All notable changes to Amplify are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-30

### Initial MVP release

First end-to-end MVP of Amplify — an AI-powered content repurposing and
multi-channel publishing platform. Built on Next.js 15 (App Router), Supabase,
Inngest, and Google Gemini.

### Added

- **Authentication**: Supabase Auth (email/password) with RLS enforcement on
  all 11 user-scoped tables.
- **Brand Vault**: Create and manage multiple brand voice profiles. AI
  analyzes a text sample to extract tone, vocabulary, and style into a
  reusable `VoiceProfile`.
- **AI Content Generation**: Repurpose source content (URL, text, or form)
  into platform-specific drafts using Gemini 2.5 Flash. Per-attempt 30s
  timeout + 180s total budget to prevent serverless function hangs.
- **Draft Review & Editing**: Review generated drafts, edit content, select
  channels, regenerate with feedback.
- **Multi-channel Publishing**: OAuth-integrated publishing to X (Twitter)
  and Facebook. Tokens encrypted at rest with AES-256-GCM.
- **Scheduling**: Schedule drafts for future publication. Calendar view
  with time-slot picker, queue list, and per-draft cancel.
- **Analytics Dashboard**: Track posts, publish history, and per-channel
  performance.
- **Browser Extension (Chrome MV3)**: Inject into Facebook groups to register
  and manage social targets. Uses API token auth (not Supabase session).
- **Inngest Background Workers**: Brand vault analysis, content repurposing,
  and scheduled publishing.
- **Rate Limiting**: Client-side rate limit on login/register (5 attempts /
  15 min lockout) for UX protection.
- **Security Hardening**: RLS on all tables, OAuth token encryption, JWT and
  sensitive-field redaction in logs, timing-safe OAuth state comparison.
- **Test Suite**: 345 Vitest unit tests across 15 files, plus 43 Playwright
  E2E tests. CI-ready.

### Security

- **CRITICAL** — `/api/extension/targets/[targetId]` migrated from
  cookie-session client to service-role client (`supabaseAdmin`) because
  Bearer-token requests have no Supabase session.
- **CRITICAL** — `/api/extension/register` was using `createClient()` (anon
  key) for `auth.admin.updateUserById`; migrated to `supabaseAdmin`. Without
  this fix, extension registration would always fail.
- **HIGH** — Facebook `appsecret_proof` was being computed with
  `SHA-256(concat)` instead of `HMAC-SHA256(key, data)`. Facebook would
  have rejected every Graph API call. Fixed in `/api/social/facebook/callback`.

### Changed

- Channel name canonicalized: `'twitter'` deprecated in favour of `'x'`.
  `validateChannels` accepts both and normalises to `'x'`. Existing drafts
  with `'twitter'` still load.
- Logger: expanded sensitive-key detection (exact + pattern match) and added
  JWT-shaped string redaction inside string values.
- OAuth state validation now does constant-time string comparison and
  accepts an optional `expectedState` argument.

### Known Limitations

- **Client-side rate limiting only** — the 5 attempts / 15 min lockout is a
  UX layer, not a security boundary. Determined attackers can clear
  localStorage. Server-side rate limiting (per IP / per account) is a
  post-launch enhancement. For production, deploy with Supabase rate limits
  or Cloudflare WAF rules.
- **`hashtag-rotator`** may produce duplicate hashtags when the available
  pool is smaller than `minTags` and falls back to recent items. Low impact
  in practice.
- **`suggestHashtagsFromContent`** substring-matches `"ai"` and may match
  unrelated words (e.g. "available", "say"). Future improvement: use the AI
  model to suggest hashtags.
- **E2E test coverage** — 43 Playwright tests use a `mockAllExternalApis`
  helper, so they do not exercise live X/Facebook APIs. Full manual testing
  sweep (89 items) is required before production launch.

### Test Summary (Sprint 5)

| Suite | Tests | Result |
|---|---|---|
| Vitest unit | 345 | ✅ 345/345 pass |
| Vitest coverage (lib/) | 9 files at 100% | ✅ |
| Playwright E2E | 43 | ✅ No crashes (uses mocked external APIs) |
| Production build | — | ✅ 11.3s |
