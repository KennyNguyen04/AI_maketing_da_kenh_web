# Amplify Frontend

Next.js 15 (App Router) application for Amplify — an AI-powered content
repurposing and multi-channel publishing platform.

## Tech Stack

- **Next.js 15** (App Router) — frontend + API routes
- **Supabase** — Postgres database, auth, RLS
- **Inngest** — background jobs (scheduling, AI generation)
- **Gemini AI** (`@google/genai`) — content generation
- **Tailwind CSS** — styling
- **Framer Motion** — animations
- **TypeScript** — type safety

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment template and fill in:
   ```bash
   cp .env.example .env.local
   ```

3. Run migrations in Supabase SQL Editor (files in `../migrations/`).

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. (Optional) Start Inngest dev server:
   ```bash
   npx inngest-cli@latest dev
   ```

## Environment Variables

See `lib/env.ts` for validation rules. Required vars:

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_SERVICE_ROLE_KEY` — server-only admin key
- `TOKEN_ENCRYPTION_KEY` — 32+ chars, encrypts OAuth tokens at rest
- `GEMINI_API_KEY` — Google Gemini API key

Optional (per-feature):

- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` — Inngest
- `X_CLIENT_ID` / `X_CLIENT_SECRET` / `X_REDIRECT_URI` — X (Twitter) OAuth
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` / `FACEBOOK_REDIRECT_URI` — Facebook OAuth

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests |

## Folder Structure

```
app/
  (auth)/           — login, register pages
  (app)/            — authenticated app pages (dashboard, settings, drafts, etc.)
  api/              — API routes
components/
  ui/               — design system primitives
  features/         — feature-level composites
features/
  auth/             — auth-related hooks/components
  jobs/             — job status polling
  drafts/           — draft management
lib/
  ai/               — Gemini client, prompts, parsers, budget tracking
  inngest/          — background job workers
  social/           — OAuth, token encryption, rate limiting
  supabase/         — Supabase clients (server, admin, middleware)
  observability/    — structured logging
  validation/       — input validation helpers
  utils/            — general utilities
extension/          — Chrome Extension (Manifest V3)
tests/              — Vitest + Playwright tests
migrations/         — SQL migrations (run in Supabase)
```

## Chrome Extension

The `extension/` folder contains a Manifest V3 extension that automates
posting to Facebook groups / pages from inside the browser session.

To install:
1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `extension/`
4. Create an API token in app Settings → Extension
5. Paste token into extension popup

## Health Check

```bash
curl http://localhost:3000/api/health
```

Returns DB connectivity, schema access, env validation status.