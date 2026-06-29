# Amplify — AI Marketing Đa Kênh

Nền tảng soạn thảo nội dung Marketing bằng AI và phân phối đa kênh mạng xã hội.

Turn one source (URL, text, or form) into platform-ready drafts for X
(Twitter), Facebook, and LinkedIn — and schedule or publish them in a
click. Each brand gets its own "Brand Vault" with a learned voice profile
so the output sounds like *you*, not a generic bot.

## Status

**v0.1.0 MVP** — first end-to-end release. Feature-complete against the
MVP scope. See `RELEASE_NOTES.md` and `CHANGELOG.md` for details.

## Quick start

```bash
# 1. Install
cd frontend
npm install

# 2. Configure
cp .env.example .env.local
# Fill in Supabase, Gemini, OAuth credentials. See .env.example for details.

# 3. Run migrations in Supabase SQL Editor
#    (files in ./migrations/, in order)

# 4. Start
npm run dev
# App: http://localhost:3000

# 5. (Optional) Start Inngest dev server for background workers
npx inngest-cli@latest dev
```

## Project layout

```
.
├── frontend/          Next.js 15 (App Router) app — UI + API routes
├── extension/         Chrome MV3 browser extension
├── migrations/        Supabase SQL migrations (run in order)
├── tests/             Playwright E2E + manual testing checklist
├── lib/               (this repo's root — see lib/ in frontend/)
├── CHANGELOG.md       Version history
├── RELEASE_NOTES.md   v0.1.0 release notes
└── .cursor/           Cursor rules and project context
```

For frontend-specific docs, see [`frontend/README.md`](./frontend/README.md).
For the extension, see [`extension/README.md`](./extension/README.md).

## Test summary (v0.1.0)

| Suite | Result |
|---|---|
| Vitest unit tests | 345/345 pass |
| Vitest coverage (lib/) | 9 files at 100%, overall 39.59% |
| Playwright E2E | 43 tests, no crashes |
| Production build | ✅ 11.3s |
| Security audit | 3 critical/high bugs fixed in sprint 5 |

## Tech stack

- **Next.js 15** (App Router) — frontend + API routes
- **Supabase** — Postgres, Auth, RLS
- **Inngest** — background workers (scheduling, AI generation)
- **Google Gemini 2.5 Flash** — content generation
- **Tailwind CSS** — styling
- **TypeScript** — end-to-end type safety

## License

Private / internal — not for public distribution.
