# 05 — Codex Build Instructions (How to Execute)

## Role of This Document

This document tells Codex **exactly in what order** to build the project, and what to verify at each step. Follow strictly — do not skip steps.

---

## CRITICAL RULES FOR CODEX

1. **Use ONLY mock data** — no API calls, no real auth, no backend. All data comes from `lib/mock-data.ts`.
2. **Do NOT install any packages beyond** what's in `00_PROJECT_SETUP.md`. No UI libraries (no shadcn, no radix, no headlessui).
3. **All styles via Tailwind v4** — use the `@theme` CSS custom properties defined in `globals.css`. No inline styles unless absolutely necessary.
4. **All components use TypeScript** — every file must have proper TypeScript types.
5. **Mobile is NOT required** — optimize for 1280px and 1440px desktop only.
6. **Language:** Use bilingual labels (Vietnamese / English) as shown in the screen specs. Format: "Tiếng Việt / English".
7. **Framer Motion** — use for: page transitions, loading animations, card hover effects, toast animations. Keep subtle.
8. **Lucide React** — use for ALL icons. Import only what you use.

---

## Build Order (Execute in Sequence)

### Step 1 — Bootstrap Project
```bash
# In the /frontend directory:
npx -y create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"
npm install lucide-react framer-motion clsx
```

Verify: `npm run dev` runs without errors.

---

### Step 2 — Design System Setup
Files to create/modify:
1. Replace `app/globals.css` with the full content from `00_PROJECT_SETUP.md` (the `@theme` block)
2. Replace `app/layout.tsx` with the content from `00_PROJECT_SETUP.md`
3. Create `lib/mock-data.ts` with the full content from `01_MOCK_DATA.md`

Verify: 
- Page background is `#ffffff`
- Font is Inter (from Google Fonts)
- No console errors

---

### Step 3 — Build UI Components (in order)
Build all components in `components/ui/`. Reference `02_UI_COMPONENTS.md` for exact styles.

Order:
1. `Button.tsx` — all 4 variants + loading state
2. `Input.tsx` — text, textarea, url
3. `Card.tsx` — all 5 variants
4. `StatusBadge.tsx` — all 4 statuses + pulse for processing
5. `Tag.tsx` — all 4 colors + editable mode
6. `Tabs.tsx` — underline active style
7. `Modal.tsx` — overlay + card + button row
8. `Toast.tsx` — all 3 types + enter/exit animation
9. `Skeleton.tsx` — shimmer animation

Verify: Create a temporary test page `app/test/page.tsx` that renders all components with example props. Delete after verification.

---

### Step 4 — Build App Layout
Files:
1. `components/layout/Sidebar.tsx`
2. `components/layout/AppLayout.tsx`
3. `app/(app)/layout.tsx` — uses AppLayout

Reference: `03_SCREENS_LANDING_AUTH_ONBOARDING.md` section "LAYOUT"

Verify: Navigate to any app route and sidebar appears correctly with correct nav items.

---

### Step 5 — Build Auth Layout + Screens
Files:
1. `app/(auth)/layout.tsx` — centered layout
2. `app/(auth)/login/page.tsx`
3. `app/(auth)/register/page.tsx`

Reference: `03_SCREENS_LANDING_AUTH_ONBOARDING.md` sections "SCREEN 1" and "SCREEN 2"

Mock behavior:
- Login form submit → `router.push('/dashboard')`
- Register form submit → `router.push('/onboarding')`

Verify: Forms render correctly, buttons redirect as expected.

---

### Step 6 — Build Onboarding Screens
Files (build in order):
1. `components/onboarding/FlowSelector.tsx`
2. `components/onboarding/BrandVaultSetupText.tsx`
3. `components/onboarding/BrandVaultSetupForm.tsx`
4. `components/onboarding/AnalyzingLoader.tsx`
5. `components/onboarding/VoiceProfilePreview.tsx`
6. `app/(app)/onboarding/page.tsx`
7. `app/(app)/onboarding/confirm/page.tsx`

Reference: `03_SCREENS_LANDING_AUTH_ONBOARDING.md` sections "SCREEN 3" and "SCREEN 4"

Key behaviors:
- Selecting a flow card highlights it (border becomes sky-blue)
- Submit → shows AnalyzingLoader → after 4s setTimeout → router.push('/onboarding/confirm')
- Tags in confirm page are removable
- "Lưu Brand Vault" → Toast success → router.push('/dashboard')

Verify: Full flow works end-to-end without errors.

---

### Step 7 — Build Dashboard Screen
Files:
1. `components/dashboard/BrandVaultStatus.tsx`
2. `components/dashboard/EmptyState.tsx`
3. `components/dashboard/JobCard.tsx`
4. `components/dashboard/JobList.tsx`
5. `app/(app)/dashboard/page.tsx`

Reference: `04_SCREENS_DASHBOARD_REVIEW.md` section "SCREEN 5"

Key behaviors:
- All data from MOCK_JOBS and MOCK_BRAND_VAULT
- "Tạo nội dung mới" button → router.push('/dashboard/new')
- "Xem / View" button on done jobs → router.push('/review/job-001')

Verify: Dashboard shows all 4 mock jobs with correct statuses and stats.

---

### Step 8 — Build New Job Screen
Files:
1. `components/jobs/JobStatusPoller.tsx`
2. `components/jobs/NewJobForm.tsx`
3. `app/(app)/dashboard/new/page.tsx`

Reference: `04_SCREENS_DASHBOARD_REVIEW.md` section "SCREEN 6"

Key behaviors:
- Channel cards toggle selected state on click
- Word count updates in real-time in textarea
- Submit → shows JobStatusPoller → sequential step animations → after ~5s → router.push('/review/job-001')

Verify: Form submits, poller animates, redirects correctly.

---

### Step 9 — Build Review Dashboard Screen
Files (build in order):
1. `components/review/CopyButton.tsx`
2. `components/review/RegenerateButton.tsx`
3. `components/review/MarkDoneButton.tsx`
4. `components/review/SourcePanel.tsx`
5. `components/review/DraftTabs.tsx`
6. `components/review/DraftEditor.tsx`
7. `app/(app)/review/[jobId]/page.tsx`

Reference: `04_SCREENS_DASHBOARD_REVIEW.md` section "SCREEN 7"

Key behaviors:
- `[jobId]` from URL, but always load MOCK_JOBS[0] and its MOCK_DRAFTS for mock
- Tab switch shows different draft content
- Textarea is editable (controlled component with useState)
- Typing in textarea → shows "Đang lưu..." → after 1s debounce → "Đã lưu ✓"
- Copy → navigator.clipboard.writeText → Toast success → button turns green 2s → resets
- Regenerate → Modal confirm → close modal → skeleton on textarea → after 2s → show modified content
- MarkDone → toggle state → Toast success

Verify: All 4 tabs show different content, copy works, regenerate cycle works.

---

### Step 10 — Build Landing Page
File: `app/page.tsx`

Reference: `03_SCREENS_LANDING_AUTH_ONBOARDING.md` section "SCREEN 0"

Key behaviors:
- Sticky nav with logo + 2 buttons
- Hero with gradient background and 3-line headline
- All 8 sections rendered in order
- All CTA buttons link to correct routes
- Footer with deep-moss background

Verify: All sections visible, no overflow issues at 1280px width.

---

### Step 11 — Polish Pass
After all screens are built:

1. **Framer Motion animations:**
   - Landing page: fade-in sections on scroll (use `whileInView` + `initial={{ opacity: 0, y: 20 }}`)
   - Cards: `whileHover={{ y: -4 }}` + `transition={{ duration: 0.2 }}`
   - Auth/onboarding page: `initial={{ opacity: 0, y: 16 }}` → `animate={{ opacity: 1, y: 0 }}` on mount
   - Toast: slide up from bottom on appear, fade down on dismiss
   - Tab content switch: `AnimatePresence` with fade

2. **Responsive check:**
   - Test at 1280px width (min supported)
   - Test at 1440px width (optimal)
   - Fix any overflow issues

3. **SEO meta:**
   - Verify each page has correct `metadata` export with title and description
   - Titles follow format: "Page Name — Amplify"

4. **Empty states:**
   - If MOCK_JOBS is cleared (test manually), dashboard shows EmptyState
   - If no Brand Vault (set MOCK_BRAND_VAULT to null temporarily), dashboard shows setup prompt

5. **Console check:**
   - Zero TypeScript errors (`npm run build`)
   - Zero ESLint warnings (`npm run lint`)

---

## File Naming Conventions

- Components: PascalCase (`Button.tsx`, `DraftEditor.tsx`)
- Utility files: camelCase (`mock-data.ts`)
- Pages: Next.js convention (`page.tsx`, `layout.tsx`)
- No `.js` files — TypeScript only

## Import Alias

Use `@/` for absolute imports. Example:
```tsx
import { Button } from '@/components/ui/Button'
import { MOCK_JOBS } from '@/lib/mock-data'
```

## Component Export Pattern

Always use named exports for components:
```tsx
// ✅ Correct
export function Button({ ... }) { ... }
export type { ButtonProps }

// ❌ Wrong
export default function Button() { ... }
```

Exception: page files MUST use default export (Next.js requirement):
```tsx
export default function DashboardPage() { ... }
```

---

## Common Patterns

### Debounce for Autosave
```tsx
import { useEffect, useRef } from 'react'

function useDebounce(value: string, delay: number, callback: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(callback, delay)
    return () => clearTimeout(timer.current)
  }, [value])
}
```

### Clipboard Copy
```tsx
async function handleCopy(text: string) {
  await navigator.clipboard.writeText(text)
  // Set copied state for 2s
  setIsCopied(true)
  setTimeout(() => setIsCopied(false), 2000)
}
```

### Sequential Animation Steps (for JobStatusPoller)
```tsx
const [completedSteps, setCompletedSteps] = useState<number[]>([])

useEffect(() => {
  const delays = [500, 1500, 2500, 3500, 4500]
  delays.forEach((delay, index) => {
    setTimeout(() => {
      setCompletedSteps(prev => [...prev, index])
    }, delay)
  })
  // After all steps, redirect
  setTimeout(() => router.push('/review/job-001'), 5500)
}, [])
```

### Page Entry Animation (Framer Motion)
```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
  {/* page content */}
</motion.div>
```

---

## Deliverable Checklist

When Codex finishes, the following must be true:

- [ ] `npm run dev` starts without errors
- [ ] `npm run build` succeeds with 0 TypeScript errors
- [ ] `npm run lint` passes with 0 errors
- [ ] All 8 routes render correctly:
  - [ ] `/` — Landing page (all 8 sections visible)
  - [ ] `/login` — Login form
  - [ ] `/register` — Register form
  - [ ] `/onboarding` — Brand Vault wizard (both flows work)
  - [ ] `/onboarding/confirm` — Voice profile with editable tags
  - [ ] `/dashboard` — Shows 4 mock jobs + stats
  - [ ] `/dashboard/new` — Form + poller animation + redirect
  - [ ] `/review/job-001` — 4 tabs, copy, regenerate, autosave mock
- [ ] All design tokens correctly applied (no hardcoded hex colors outside globals.css)
- [ ] All interactive states work (hover, focus, active, disabled)
- [ ] Framer Motion animations present on landing, auth, and review screens
- [ ] No console errors or warnings
