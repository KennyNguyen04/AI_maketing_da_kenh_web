# Amplify v0.1.0 — Release Notes

**Release date:** 2026-06-30
**Tag:** `v0.1.0`
**Status:** MVP — pre-production

---

## What's in this release

This is the first end-to-end MVP of Amplify, a content repurposing and
multi-channel publishing platform. It is feature-complete for the MVP
scope defined in the project rules (see `.cursor/rules/amplify-mvp-project.mdc`)
and ready for internal / staging deployment.

---

## Highlights

### Core flow
1. **Sign up** with email + password (Supabase Auth).
2. **Create a Brand Vault** — paste a text sample, AI extracts a `VoiceProfile`.
3. **Create a Job** from URL, text, or form-based input.
4. **AI generates drafts** for each selected channel (X, Facebook, LinkedIn).
5. **Review, edit, and publish** — or schedule for a future time.
6. **Track results** in the analytics dashboard.

### Browser extension
A Chrome MV3 extension lets users register Facebook group targets from the
UI. Targets sync to the dashboard and can be used in publishing jobs.

---

## Bug fixes in this release

Three security-relevant bugs were caught during Sprint 5 testing and
**fixed before tag**:

| # | Severity | What | Impact if unfixed |
|---|---|---|---|
| 1 | **CRITICAL** | `/api/extension/register` was using anon client for `auth.admin.updateUserById` | Extension registration would always fail with permission error |
| 2 | **CRITICAL** | `/api/extension/targets/[targetId]` was using cookie-session client instead of service-role | Extension could not read/update targets via Bearer token |
| 3 | **HIGH** | Facebook `appsecret_proof` used `SHA-256(concat)` instead of `HMAC-SHA256(key, data)` | Facebook Graph API would reject all server-side calls → OAuth flow broken |

All three were caught by **post-implementation review** and fixed in the
same commit cycle.

---

## Known limitations

These are documented in `CHANGELOG.md` under "Known Limitations":

- **Client-side rate limiting only** — server-side rate limit (per IP / per
  account) is post-launch. For production, add Cloudflare WAF rules or
  Supabase Edge Function rate limits.
- **E2E tests use mocked external APIs** — full manual testing sweep is
  required before public launch.
- **`hashtag-rotator` and `suggestHashtagsFromContent`** have minor edge
  cases that are documented but not fixed in this release.

---

## Deployment checklist

Before deploying to production:

- [ ] Run all Supabase migrations in order (files in `migrations/`).
- [ ] Set every required env var (see `frontend/.env.example`).
- [ ] Generate a strong `TOKEN_ENCRYPTION_KEY`:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Configure OAuth redirect URIs in X Developer Portal and Facebook App
  Dashboard to match `X_REDIRECT_URI` / `FACEBOOK_REDIRECT_URI`.
- [ ] Deploy a server-side rate limiter (Cloudflare WAF, Supabase Edge
  Functions, or upstream proxy).
- [ ] Run manual testing sweep (89 items in `tests/MANUAL_TESTING.md`).
- [ ] Configure Inngest production environment with `INNGEST_EVENT_KEY` and
  `INNGEST_SIGNING_KEY`.
- [ ] Verify RLS on all 11 user-scoped tables in Supabase dashboard.

---

## Test results

| Suite | Result |
|---|---|
| Vitest unit tests | 345/345 pass |
| Vitest coverage (lib/) | 9 files at 100%, overall 39.59% |
| Playwright E2E | 43 tests run, no crashes |
| Production build | ✅ 11.3s, no errors |

---

## How to upgrade

This is the first tag, so no upgrade path. Future versions will document
migration steps here.

---

## Credits

Built with Next.js 15, Supabase, Inngest, Google Gemini, and Tailwind CSS.
Sprint 5 testing and bug-hunt pass completed 2026-06-30.
