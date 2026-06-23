# 00 — Project Setup: Amplify Frontend

## Overview

**Product name:** Amplify  
**Tagline (EN):** *Repurpose once. Publish everywhere.*  
**Tagline (VI):** *Một bài gốc. Đa kênh. Giọng văn vẹn nguyên.*  
**Description:** A web platform for Vietnamese solo founders and engineers to repurpose long-form content (blog posts, reports) into multi-channel social drafts (LinkedIn, Facebook, X/Twitter) while preserving their personal brand voice.  
**Language:** Bilingual — Vietnamese primary labels, English secondary (toggle or static dual-language where noted)

---

## Commands to Bootstrap

Run these commands IN ORDER in the project root (`/frontend`):

```bash
# 1. Init Next.js 15 with all options
npx -y create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --no-src-dir \
  --import-alias "@/*"

# 2. Install dependencies
npm install lucide-react framer-motion clsx

# 3. No additional packages needed for mock-data phase
```

---

## File Structure to Create

```
/frontend
├── app/
│   ├── globals.css                    ← Design tokens + base styles
│   ├── layout.tsx                     ← Root layout (fonts)
│   ├── page.tsx                       ← Landing page (redirect or full page)
│   ├── (auth)/
│   │   ├── layout.tsx                 ← Auth layout (no sidebar)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (app)/
│       ├── layout.tsx                 ← App layout (with sidebar)
│       ├── onboarding/
│       │   ├── page.tsx               ← Step 1: Choose flow A or B
│       │   └── confirm/page.tsx       ← Step 2: Review voice profile
│       ├── dashboard/
│       │   ├── page.tsx               ← Main dashboard
│       │   └── new/page.tsx           ← Create new job
│       └── review/
│           └── [jobId]/page.tsx       ← Review drafts
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── AppLayout.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── Tag.tsx
│   │   ├── Tabs.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── Skeleton.tsx
│   ├── onboarding/
│   │   ├── FlowSelector.tsx
│   │   ├── BrandVaultSetupText.tsx
│   │   ├── BrandVaultSetupForm.tsx
│   │   ├── AnalyzingLoader.tsx
│   │   └── VoiceProfilePreview.tsx
│   ├── dashboard/
│   │   ├── BrandVaultStatus.tsx
│   │   ├── JobList.tsx
│   │   ├── JobCard.tsx
│   │   └── EmptyState.tsx
│   ├── jobs/
│   │   ├── NewJobForm.tsx
│   │   └── JobStatusPoller.tsx
│   └── review/
│       ├── SourcePanel.tsx
│       ├── DraftTabs.tsx
│       ├── DraftEditor.tsx
│       ├── CopyButton.tsx
│       ├── RegenerateButton.tsx
│       └── MarkDoneButton.tsx
└── lib/
    └── mock-data.ts                   ← All mock data for the app
```

---

## globals.css — Full Design Tokens

Replace the contents of `app/globals.css` with exactly this:

```css
@import "tailwindcss";

@theme {
  /* ── Colors ── */
  --color-midnight-ink: #080331;
  --color-regal-violet: #1b1463;
  --color-forest-fern: #328a3b;
  --color-sky-blue: #4865ff;
  --color-deep-moss: #0d5238;
  --color-sunset-orange: #ff6d39;
  --color-blush-pink: #f098d7;
  --color-vivid-green: #114e0b;
  --color-lavender-bloom: #ffaefe;
  --color-outline-blue: #a2baff;
  --color-hint-of-blue: #dce4fb;
  --color-vibrant-orange: #f65300;
  --color-pitch-black: #000000;
  --color-pure-canvas: #ffffff;
  --color-light-gray: #cccccc;
  --color-warm-sand: #f8f3eb;
  --color-dark-charcoal: #333333;
  --color-muted-stone: #eae4d9;
  --color-gradient-aura-start: #cc7ab5;

  /* ── Typography ── */
  --font-heading: 'Lora', Georgia, serif;
  --font-body: 'Inter', ui-sans-serif, system-ui, sans-serif;

  /* ── Type Scale ── */
  --text-caption: 12px;
  --leading-caption: 1.6;
  --text-body-sm: 14px;
  --leading-body-sm: 1.4;
  --text-body: 16px;
  --leading-body: 1.3;
  --text-subheading: 20px;
  --leading-subheading: 1.1;
  --text-heading-sm: 24px;
  --leading-heading-sm: 1;
  --text-heading: 32px;
  --leading-heading: 1.1;
  --text-heading-lg: 48px;
  --leading-heading-lg: 1;
  --text-display: 64px;
  --leading-display: 1;

  /* ── Spacing ── */
  --spacing-8: 8px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-128: 128px;

  /* ── Border Radius ── */
  --radius-card: 16px;
  --radius-badge: 1600px;
  --radius-button: 1600px;
  --radius-nav: 100px;

  /* ── Shadows ── */
  --shadow-sm: rgba(75, 68, 57, 0.05) 0px 4px 4px 0px, rgba(75, 68, 57, 0.08) 0px 32px 16px 0px;
  --shadow-md: rgba(99, 91, 79, 0.08) 0px 8px 16px 0px, rgba(99, 91, 79, 0.04) 0px 32px 32px 0px;
  --shadow-lg: rgba(75, 68, 57, 0.1) 0px 12px 24px 0px, rgba(75, 68, 57, 0.1) 0px 48px 48px 0px;
}

@layer base {
  html {
    font-family: var(--font-body);
    background-color: var(--color-pure-canvas);
    color: var(--color-midnight-ink);
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4 {
    font-family: var(--font-heading);
    font-weight: 400;
  }
}
```

---

## Root Layout (app/layout.tsx)

```tsx
import type { Metadata } from 'next'
import { Inter, Lora } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

const lora = Lora({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-lora',
  weight: ['400'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Amplify — Repurpose once. Publish everywhere.',
  description: 'AI-powered content repurposing platform for Vietnamese solo founders. Transform one article into multi-channel social drafts while preserving your brand voice.',
  keywords: ['AI marketing', 'content repurposing', 'brand voice', 'LinkedIn', 'social media'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${lora.variable}`}>
        {children}
      </body>
    </html>
  )
}
```

> **Important:** In `globals.css`, update font variables to use `var(--font-lora)` for headings and `var(--font-inter)` for body after adding the Next.js font variables above.

---

## Mock Data (lib/mock-data.ts)

See file `01_MOCK_DATA.md` for the full mock data specification.
