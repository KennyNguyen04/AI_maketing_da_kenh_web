# 04 — Screen Specifications: Dashboard, New Job, Review Dashboard

---

## SCREEN 5 — Dashboard (`app/(app)/dashboard/page.tsx`)

Uses `AppLayout` (sidebar + content area). The main hub.

Page title: "Dashboard — Amplify"

### Top Bar (inside content area, not sidebar)
```
display: flex, justify-content: space-between, align-items: center
margin-bottom: 40px
```

Left:
- Heading H1: Lora 32px #080331 — "Xin chào, Tuấn! / Hello, Tuấn!"
- Subtext: Inter 14px #333333 — "Thứ Sáu, 16 tháng 5, 2026" (current date)

Right:
- Primary Button with Lucide `Plus` icon before text: "+ Tạo nội dung mới / Create new"
- Button style: Sky Blue, border-radius 1600px, padding 12px 24px
- Clicks → navigates to `/dashboard/new`

### Brand Vault Status Card
```
Card variant="sand" (background #f8f3eb)
margin-bottom: 32px
display: flex, align-items: center, justify-content: space-between
```

Left section:
```
display: flex, align-items: center, gap: 16px
```
- Icon circle: 48px, background #4865ff, color white, Lucide `Fingerprint` icon 24px
- Text block:
  - Inter 500 14px #333333 — "Brand Vault"
  - Lora 24px #080331 — "Giọng văn chính" (MOCK_BRAND_VAULT.name)
  - Inter 12px #333333 — "Tone: Chuyên nghiệp · Thực tế · Trực tiếp" (first 3 tone tags joined)

Right section:
- Ghost Button small: Lucide `Edit3` icon + "Chỉnh sửa / Edit" — navigates to `/onboarding`
- Status pill: Tag component, color="green", label "Active · Đang hoạt động"

**If no Brand Vault exists** (show this alternate version when MOCK_BRAND_VAULT is null):
```
background: #f8f3eb
border: 2px dashed #cccccc
display: flex, align-items: center, gap: 16px
```
- Lucide `AlertCircle` icon 24px, color #ff6d39
- Text: "Bạn chưa thiết lập Brand Vault. / No Brand Vault yet."
- Primary Button: "Thiết lập ngay / Set up now" → `/onboarding`

### Stats Row (3 counters)
```
display: grid, grid-template-columns: repeat(3, 1fr), gap: 24px
margin-bottom: 40px
```

Each stat card (Card variant="default"):
- Number: Lora 40px #4865ff (sky-blue)
- Label: Inter 14px #333333

Stats:
1. Number: count of jobs with status "done" (from MOCK_JOBS). Label: "Bài đã hoàn thành / Completed"
2. Number: count of all jobs. Label: "Tổng số lần tái chế / Total repurposed"
3. Number: count MOCK_DRAFTS total. Label: "Bản nháp đã tạo / Drafts created"

### Jobs Section
```
display: flex, justify-content: space-between, align-items: center
margin-bottom: 24px
```

Left: H2 Lora 24px #080331 — "Lịch sử tái chế / Repurpose history"
Right: sort/filter placeholder (non-functional): Inter 14px #333333 — "Gần nhất / Most recent ↓"

**JobList — if MOCK_JOBS is not empty:**

Table-like layout (use a `<ul>` or `<div>` list, not `<table>`):

Header row:
```
display: grid
grid-template-columns: 2fr 1fr 1fr 1fr 120px
padding: 8px 16px
Inter 12px #cccccc, text-transform uppercase, letter-spacing 0.05em
headers: "Tiêu đề / Title" | "Kênh / Channels" | "Ngày / Date" | "Trạng thái / Status" | ""
border-bottom: 1px solid #eae4d9
```

Each job row (render each item from MOCK_JOBS):
```
display: grid
grid-template-columns: 2fr 1fr 1fr 1fr 120px
padding: 16px
align-items: center
border-bottom: 1px solid #f8f3eb
hover: background #f8f3eb
border-radius: 8px
```

Column 1 — Title:
```
Lora 16px #080331 — job.title (truncate with ellipsis if >60 chars)
Inter 12px #cccccc — job.source_type === 'url' ? 'Từ URL' : 'Từ text'
```

Column 2 — Channels:
```
Show channel count: Inter 14px #333333 — "4 kênh" (job.channels.length + " kênh")
Show small channel icons (just text abbreviations in tiny pills):
  - linkedin_post → "LI" pill
  - twitter → "X" pill
  - facebook → "FB" pill
  Pill style: 1600px radius, padding 2px 8px, bg #dce4fb, Inter 11px #1b1463
```

Column 3 — Date:
```
Inter 14px #333333 — format: "14 tháng 5" (day month in Vietnamese)
```

Column 4 — Status:
```
<StatusBadge status={job.status} />
```

Column 5 — Action:
- If status === 'done': Ghost Button small "Xem / View" → `/review/${job.id}`
- If status === 'failed': Ghost Button small danger color "Thử lại / Retry"
- If status === 'processing': text "Đang xử lý..." Inter 12px #4865ff (no button)
- If status === 'pending': text "Chờ..." Inter 12px #cccccc

**EmptyState — if MOCK_JOBS is empty:**
```
text-align: center
padding: 80px 32px
```
- Lucide icon `FileSearch`, size 64px, color #cccccc
- Title: Lora 24px #080331 — "Chưa có nội dung nào"
- Body: Inter 16px #333333 — "Tạo nội dung đầu tiên để bắt đầu."
- Primary Button: "Tạo ngay / Create now" → `/dashboard/new`

---

## SCREEN 6 — New Job (`app/(app)/dashboard/new/page.tsx`)

Page title: "Tạo nội dung mới — Amplify"

Back link at top: Lucide `ArrowLeft` + "Quay lại Dashboard / Back to Dashboard" → `/dashboard`

H1: Lora 40px #080331 — "Tạo nội dung mới"
Subtext: Inter 16px #333333 — "AI sẽ tái chế bài viết của bạn thành bản nháp cho các kênh đã chọn."

---

Main form (max-width 720px):

### Field 1: Brand Vault Selection
```
Label: Inter 500 14px #080331 — "Brand Vault"
```
Show as a selectable card (not a dropdown), using MOCK_BRAND_VAULT:
```
Card variant="sand", border 2px solid #4865ff (selected state), padding 16px
display: flex, align-items: center, gap: 12px
Lucide Fingerprint 20px #4865ff
Text: "Giọng văn chính" (name), small tag "Active"
```

### Field 2: Content Input
```
Label: Inter 500 14px #080331 — "Bài viết gốc / Source content"
```

Tabs to toggle mode:
- "Dán text / Paste text" | "Từ URL / From URL"

When "Paste text":
- Textarea, label: none (already labeled above), placeholder: "Dán bài blog, báo cáo, hoặc script video của bạn vào đây... (tối thiểu 200 từ / minimum 200 words)"
- min-height: 240px
- Word count shown below: Inter 12px #cccccc — "0 từ / words" (updates on input)

When "URL":
- Input type="url", placeholder "https://yourblog.com/post"
- Helper text: Inter 12px #cccccc — "Chỉ hỗ trợ URL công khai. Trang yêu cầu đăng nhập sẽ không hoạt động."

### Field 3: Channel Selection
```
Label: Inter 500 14px #080331 — "Chọn kênh / Select channels"
```

4 channel checkboxes, styled as toggle cards:

Layout: 2×2 grid, gap 16px

Each channel card:
```
background: #ffffff
border: 1px solid #cccccc (unselected) / 2px solid #4865ff (selected)
border-radius: 16px
padding: 16px 20px
display: flex, align-items: center, gap: 12px
cursor: pointer
```
- Channel icon (Lucide: `Linkedin` / `Twitter` / `Facebook`) — 20px
- Channel label (Inter 500 14px #080331)
- Channel description (Inter 12px #333333)
- Checkmark icon (Lucide `Check`) top-right corner — show only when selected, color #4865ff

Channels:
1. linkedin_post — icon Linkedin — "LinkedIn Post / Bài viết" — "150-300 từ, hook mạnh"
2. linkedin_thread — icon Linkedin — "LinkedIn Thread / Chuỗi" — "5-7 bài ngắn liên tiếp"
3. facebook — icon Facebook (use Lucide `Facebook`) — "Facebook Post" — "200-400 từ, kể chuyện"
4. twitter — icon Twitter (use Lucide `Twitter`) — "X / Twitter" — "<280 ký tự, hook sắc"

By default, all 4 are selected (checked).

### Field 4: Job Title (optional)
```
Label: Inter 500 14px #080331 — "Tiêu đề (không bắt buộc) / Title (optional)"
Input type="text", placeholder: "Tự động tạo từ nội dung nếu để trống / Auto-generated if empty"
```

### Submit Button
```
Full-width, Primary variant, size="lg"
text: "Tạo nội dung ✦ / Generate content ✦"
padding: 16px 32px
```

Clicking Submit triggers `JobStatusPoller`.

---

### JobStatusPoller (`components/jobs/JobStatusPoller.tsx`)

Shown after form submit (replaces form OR shown below form):

```
Card variant="sand"
text-align: center
padding: 48px 32px
```

Title: Lora 24px #080331 — "AI đang tạo nội dung..."

Progress steps shown as a vertical list with animated checkmarks:
```
display: flex, flex-direction: column, gap: 12px
text-align: left, max-width: 360px, margin: 32px auto
```

Steps (animate in sequence with delays):
1. "Đọc Brand Vault..." → after 0.5s show ✓
2. "Tạo LinkedIn Post..." → after 1.5s show ✓
3. "Tạo LinkedIn Thread..." → after 2.5s show ✓
4. "Tạo Facebook Post..." → after 3.5s show ✓
5. "Tạo X / Twitter..." → after 4.5s show ✓

Each step: 
- Pending: Inter 14px #cccccc, Lucide `Circle` icon
- Done: Inter 14px #4865ff, Lucide `CheckCircle2` icon

After all steps complete (after ~5s mock delay), auto-redirect to `/review/job-001`.

---

## SCREEN 7 — Review Dashboard (`app/(app)/review/[jobId]/page.tsx`)

The most complex screen. Uses AppLayout.

Page title: "Review: {job.title} — Amplify"

Page receives jobId from URL. Use `job-001` from MOCK_JOBS and its MOCK_DRAFTS.

### Page Header (inside content area)
```
margin-bottom: 32px
display: flex, justify-content: space-between, align-items: flex-start
```

Left:
- Back link: Lucide `ArrowLeft` + "Dashboard"
- H1: Lora 32px #080331 — job.title (from MOCK_JOBS[0])
- Status badge + date row: `<StatusBadge status="done" />` + Inter 12px #cccccc — "14 tháng 5, 2026"

Right:
- MarkDoneButton: ghost or green button depending on current `is_done` state

---

### Main Layout (2 columns)
```
display: grid
grid-template-columns: 320px 1fr
gap: 32px
align-items: start
```

---

### Left Column — Source Panel (`components/review/SourcePanel.tsx`)
```
position: sticky
top: 40px
```

Card variant="sand":
```
padding: 24px
```

Header (collapsible toggle):
```
display: flex, justify-content: space-between, align-items: center
margin-bottom: 16px
```
- Inter 500 14px #080331 — "Bài gốc / Source"
- Lucide `ChevronDown` icon (rotate to Up when expanded)

Collapsed by default (just showing title).
When expanded: show `MOCK_JOBS[0].source_content` as Inter 14px #333333, line-height 1.6, max-height 400px, overflow-y scroll.

Below source panel, show source type pill:
```
Tag color="blue" label="Text" or "URL" (based on source_type)
```

---

### Right Column — Drafts Panel

**DraftTabs (`components/review/DraftTabs.tsx`)**
```
border-bottom: 1px solid #eae4d9
margin-bottom: 24px
display: flex, gap: 0
```

4 tabs for each channel in MOCK_DRAFTS:
- Tab label: "LinkedIn Post", "LinkedIn Thread", "Facebook", "X / Twitter"
- Tab active style: Inter 500 14px #4865ff, border-bottom 2px solid #4865ff
- Tab inactive: Inter 500 14px #333333
- Each tab padding: 12px 20px
- Show character count badge on tab if channel has a limit: small pill "#dce4fb" bg — e.g., "248 / 280" for Twitter

Only show content for active tab.

---

**DraftEditor (`components/review/DraftEditor.tsx`)**

For the currently active tab's draft:

```
display: flex, flex-direction: column, gap: 12px
```

Top row (metadata):
```
display: flex, justify-content: space-between, align-items: center
```
- Left: Inter 12px #cccccc — "Version 1" + (if is_edited) small orange pill "Đã chỉnh sửa / Edited"
- Right: autosave indicator (see below)

Autosave indicator states:
- Idle: nothing shown
- Saving: Inter 12px #cccccc — Lucide `Loader2` spinning 12px + "Đang lưu..."
- Saved: Inter 12px #328a3b — Lucide `CheckCircle2` 12px + "Đã lưu ✓"

Textarea:
```
width: 100%
min-height: 240px (varies by channel — twitter: 120px)
padding: 16px
background: #ffffff
border: 1px solid #cccccc
border-radius: 16px
font: Inter 400 16px #080331
line-height: 1.6
resize: vertical
focus: border #4865ff, shadow-sm
```
Value: draft.content (from MOCK_DRAFTS for active channel)

Below textarea:
```
display: flex, justify-content: space-between, align-items: center
```

Left — Character count:
- Inter 12px — format: "{count} ký tự / characters"
- If channel has limit (Twitter 280): show "{count} / 280"
- If over limit: color #ff6d39 + Lucide `AlertCircle` 12px

Right — Action buttons (gap 8px):
- `<RegenerateButton />`
- `<CopyButton />`

---

**CopyButton (`components/review/CopyButton.tsx`)**

Ghost Button with icon. States:
1. Default: Lucide `Copy` 16px + "Sao chép / Copy"
2. Clicked: Lucide `CheckCircle2` 16px, text "Đã sao chép! / Copied!", color green #328a3b, no border
3. Returns to default after 2 seconds

Implementation: use `navigator.clipboard.writeText(draft.content)`. Show Toast success on copy.

---

**RegenerateButton (`components/review/RegenerateButton.tsx`)**

Ghost Button: Lucide `RefreshCw` 16px + "Tạo lại / Regenerate"

Clicking opens Modal:
```
Title: "Tạo lại bản nháp? / Regenerate draft?"
Body: "Bản nháp hiện tại sẽ bị thay thế bằng phiên bản mới. Hành động này không thể hoàn tác. / The current draft will be replaced with a new version."
Cancel: Ghost Button "Hủy / Cancel"
Confirm: Primary Button "Tạo lại / Regenerate"
```

After confirm: show inline loading state on the textarea area (skeleton overlay), then after 2s mock delay replace with a slightly modified version of the content (prepend "✦ " to the start as a visual indicator that it's "new"), increment version display.

---

**MarkDoneButton (`components/review/MarkDoneButton.tsx`)**

Located in page header (right side). Two states:

State A — not done:
```
Ghost Button: Lucide `CheckSquare` + "Đánh dấu hoàn thành / Mark as done"
```

State B — done (after clicking):
```
Green Button: Lucide `CheckSquare` filled + "Đã hoàn thành / Completed"
```

On click: toggle state. Show Toast success: "Tất cả bản nháp đã được đánh dấu hoàn thành! / All drafts marked as done!"

---

### Bottom Summary Bar (optional, nice-to-have)

Fixed bar at bottom of review page:
```
position: sticky
bottom: 0
background: rgba(255,255,255,0.95)
backdrop-filter: blur(8px)
border-top: 1px solid #eae4d9
padding: 16px 48px
display: flex, justify-content: space-between, align-items: center
```

Left: Inter 14px #333333 — "4 bản nháp · 2 đã sao chép / 4 drafts · 2 copied"
Right: 
- Ghost Button: "← Bài trước" (disabled, gray)
- Primary Button: "Về Dashboard / Back to Dashboard" → `/dashboard`

---

## Navigation & Routing Summary

| Route | Component | Auth required |
|-------|-----------|---------------|
| `/` | Landing page | No |
| `/login` | Login form | No |
| `/register` | Register form | No |
| `/onboarding` | Brand Vault Setup wizard | Yes |
| `/onboarding/confirm` | Voice Profile Preview | Yes |
| `/dashboard` | Main dashboard | Yes |
| `/dashboard/new` | New Job form | Yes |
| `/review/[jobId]` | Review Dashboard | Yes |

**Mock auth behavior:** 
- `/login` and `/register` redirect to `/dashboard` on form submit
- `/onboarding` auto-redirects to `/onboarding/confirm` after loading
- All `(app)` routes: for now, do NOT implement actual auth guard. Just show pages with mock data. Auth guard will be wired up in Phase B.
