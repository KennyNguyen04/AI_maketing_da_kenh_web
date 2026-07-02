---
name: Amplify Production Deployment
overview: Plan chi tiết để deploy Amplify lên production với Vercel, Supabase Cloud, Gemini free, Namecheap domain. Bỏ OAuth (Extension dùng DOM automation), bỏ Azure/DigitalOcean (giữ Vercel+Supabase miễn phí). Tập trung sửa bug nghiêm trọng và hướng dẫn từng bước cụ thể. Azure ghi vào Future Enhancements.
todos:
  - id: fix-session-data
    content: "P0-1: Fix `sessionData.api_token` → `localData.api_token` trong extension/background.js (2 chỗ: line 120, 257)"
    status: pending
  - id: fix-scheduler-colors
    content: "P0-2: Fix SchedulerCalendar — thêm màu badge cho channels x, threads, instagram, facebook-group"
    status: pending
  - id: fix-current-processing-post
    content: "P0-3 (MỚI): Background set key `currentProcessingPost` đồng thời với PROCESSING_KEY để automator đọc được task data"
    status: pending
  - id: fix-post-failed-race
    content: "P0-4 (MỚI): Fix race condition — thêm `await` cho `chrome.storage.local.get()` trong postFailed handler ở background.js:204"
    status: pending
  - id: implement-post-targets
    content: "P0-5 (MỚI): Implement POST /api/extension/targets endpoint (SocialTargetsSettings.tsx:86 gọi nhưng thiếu handler)"
    status: pending
  - id: manual-test-extension
    content: "Phase 0 manual test: Tạo draft → schedule → Extension poll task → automator điền content → update DB status"
    status: pending
  - id: collect-prod-keys
    content: "Phase 1: Thu thập production keys (Supabase URL/keys, TOKEN_ENCRYPTION_KEY, GOOGLE_AI_API_KEY)"
    status: pending
  - id: setup-vercel
    content: "Phase 3: Tạo Vercel project, import GitHub repo, set root directory = frontend, cấu hình environment variables"
    status: pending
  - id: setup-domain
    content: "Phase 4: Thêm custom domain trên Vercel, cập nhật DNS Namecheap, update NEXT_PUBLIC_APP_URL"
    status: pending
  - id: publish-extension
    content: "Phase 5: Cập nhật extension manifest cho production URL, đóng gói và upload lên Chrome Web Store"
    status: pending
  - id: test-e2e
    content: "Phase 6: Hướng dẫn user flow đầy đủ — đăng ký → tạo content → schedule → extension auto-post"
    status: pending
  - id: manual-testing
    content: "Phase 7: Manual testing toàn bộ 87 items, ưu tiên Extension flow"
    status: pending
  - id: security-monitoring
    content: "Phase 8: Kiểm tra RLS trên Supabase, bật Vercel Analytics (optional)"
    status: pending
isProject: false
---

# Amplify MVP — Production Deployment Plan

**Trạng thái**: Plan đã cập nhật (thêm 3 bugs mới vào Phase 0 sau phân tích webapp ↔ Extension)
**Quyết định chính**:
- ❌ **Bỏ OAuth** (X, Facebook) — Extension dùng DOM automation
- ❌ **Bỏ DigitalOcean / Azure** — Giữ kiến trúc hiện tại (miễn phí, đủ dùng)
- ✅ **Vercel** (Next.js hosting) — miễn phí
- ✅ **Supabase Cloud** (PostgreSQL + Auth + RLS) — miễn phí 500MB
- ✅ **Google Gemini 2.5 Flash** (AI) — miễn phí 1500 req/ngày
- ✅ **Domain amplifyhd.tech** — đã mua trên Namecheap

**Azure ghi vào Future Enhancements** — không implement trong MVP.

## Tổng Quan Kiến Trúc Sau Khi Deploy

```
                          ┌──────────────────┐
                          │   Vercel (Free)   │
                          │   Next.js App     │
                          └────────┬─────────┘
                                   │ HTTPS
                          ┌────────▼─────────┐
                          │  Supabase Cloud  │
                          │  (PostgreSQL +   │
                          │   Auth + RLS)    │
                          └──────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
           ┌────────▼────────┐         ┌─────────▼──────┐
           │   Web Browser   │         │ Chrome Browser │
           │  (Web App UI)   │◄────────│  (Extension)  │
           └─────────────────┘  Bearer  └────────────────┘
                                   Token
```

**Điểm mấu chốt**: Extension không cần OAuth vì nó mô phỏng hành động người dùng (DOM automation) trên trình duyệt đã login sẵn của user.

**Tại sao không cần cloud riêng (Azure/DO)**:
- Vercel đã handle hosting, CDN, SSL tự động
- Supabase Cloud đã có PostgreSQL, Auth, RLS, Realtime
- Gemini free tier đủ cho 50+ users MVP
- Tự host = tốn thời gian cấu hình Nginx, SSL, backups mà không có lợi rõ rệt

**Domain**: `amplifyhd.tech` (đã mua trên Namecheap)

---

## PHASE 0: Sửa Bug Nghiêm Trọng (5 bugs)

### 0.1 Fix `sessionData.api_token` → `localData.api_token` — CRITICAL

**File**: `extension/background.js`

**Bug**: Line 120 và 257 dùng biến `sessionData` (undefined) thay vì `localData` đã được fetch ở line 113 và 242. Kết quả: Extension gửi `Bearer undefined` → API trả 401.

```120:122:extension/background.js
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.api_token}`  // BUG: sessionData is undefined
      }
```

```253:258:extension/background.js
    await fetch(`${apiBase}/api/extension/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.api_token}`  // BUG: same issue
      },
      body: JSON.stringify(body)
    });
```

**Fix**: Đổi `sessionData.api_token` → `localData.api_token` cả 2 chỗ. **Effort: 2 phút**.

---

### 0.2 Fix Scheduler Calendar — Thêm channels còn thiếu — MEDIUM

**File**: `frontend/features/scheduler/SchedulerCalendar.tsx`

**Bug**: Channels `x`, `threads`, `instagram`, `facebook-group` không có màu badge vì chỉ có `twitter` và `facebook`.

Thêm mapping:

```typescript
post.channel === 'x' && 'bg-sky-500',
post.channel === 'threads' && 'bg-blue-400',
post.channel === 'instagram' && 'bg-pink-500',
post.channel === 'facebook-group' && 'bg-indigo-600'
```

**Effort: 5 phút**.

---

### 0.3 (MỚI) Fix `currentProcessingPost` key sync — CRITICAL

**File**:
- Write: `extension/background.js:162-164` (đang set `PROCESSING_KEY`)
- Read: `extension/automators/fb-group.js:114` (đang đọc `currentProcessingPost`)
- Tương tự: `extension/automators/fb-personal.js`, `threads.js`, `instagram.js`, `x.js` (đều đọc `currentProcessingPost`)

**Bug**: Background lưu vào `PROCESSING_KEY`, nhưng tất cả automator đọc `currentProcessingPost`. Hai key khác nhau → automator không bao giờ nhận được task data → click nút "Post" mà content rỗng.

**Fix**: Trong background.js, khi set PROCESSING_KEY, set thêm cả `currentProcessingPost`:

```javascript
// background.js — sau khi tạo tab
await chrome.storage.local.set({
  [PROCESSING_KEY]: { id: task.id, channel: task.channel, tabId: tab.id, retryCount: 0 },
  currentProcessingPost: { id: task.id, content: task.content, channel: task.channel,
                            target_id: task.target_id, images: task.images }
});
```

**Effort: 5 phút**.

---

### 0.4 (MỚI) Fix race condition trong `postFailed` handler — HIGH

**File**: `extension/background.js:204-216`

**Bug**: 
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'postFailed') {
    const stored = chrome.storage.local.get(PROCESSING_KEY);  // ← Promise, thiếu await
    stored.then(s => {
      const processing = s[PROCESSING_KEY];
      if (processing && processing.retryCount < 2) {
        retryTask(processing.id);
      }
    });
    sendResponse({ ok: true });
  }
  ...
});
```

`chrome.storage.local.get()` trả Promise nhưng không có `await` → `stored` là Promise → `stored.then(s => ...)` callback nhận `s` undefined → retry logic không bao giờ chạy → mọi fail đều bị coi là "max retries exceeded".

**Fix**: Thêm `await` và đánh dấu handler là async:
```javascript
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'postFailed') {
    const s = await chrome.storage.local.get(PROCESSING_KEY);
    const processing = s[PROCESSING_KEY];
    if (processing && processing.retryCount < 2) {
      retryTask(processing.id);
    }
    sendResponse({ ok: true });
  }
  ...
});
```

**Effort: 2 phút**.

---

### 0.5 (MỚI) Implement `POST /api/extension/targets` endpoint — MEDIUM

**Files**:
- Thiếu: `frontend/app/api/extension/targets/route.ts` (chỉ có GET handler)
- Gọi: `frontend/components/SocialTargetsSettings.tsx:86`

**Bug**: Webapp gọi `POST /api/extension/targets` để tạo target mới, nhưng route chỉ có GET handler → API trả 405 Method Not Allowed.

**Fix**: Thêm POST handler trong `frontend/app/api/extension/targets/route.ts`:

```typescript
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { getTokenRecord } = await import('@/lib/api-tokens');
  const tokenData = await getTokenRecord(authHeader);
  if (!tokenData) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  const body = await req.json();
  const { provider, external_account_id, display_name, account_type, target_id, config } = body;

  if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('social_targets')
    .insert({
      user_id: tokenData.user_id,
      provider,
      external_account_id: external_account_id || null,
      display_name: display_name || null,
      account_type: account_type || 'personal',
      target_id: target_id || null,
      config: config || {},
      is_active: true,
      auto_post_enabled: false
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ target: data });
}
```

**Effort: 10 phút**.

---

### 0.6 Manual test extension flow end-to-end

Sau khi fix 5 bugs trên, manual test:

- [ ] Schedule draft với channel `facebook-group`
- [ ] Extension poll `/api/extension/tasks`, nhận task (không 401)
- [ ] Extension mở tab `facebook.com/groups/{target_id}`
- [ ] Automator đọc được `currentProcessingPost.content` (không undefined)
- [ ] Automator điền content + click Post
- [ ] `postCompleted` → PATCH status = completed → DB update đúng
- [ ] `postFailed` x 3 lần → retry logic chạy (không bị Promise race)

**Effort: 15 phút**.

---

**Exit criteria Phase 0**:
- Tất cả 5 bugs đã fix và commit
- Manual test extension end-to-end pass
- Không console error trong background.js / content scripts

---

## PHASE 1: Thu Thập Production Keys

**Context**: Schema Supabase đã OK (verified qua `supabase database.txt`), không cần chạy migrations. Phase 1 chỉ tập trung thu thập 5 env vars cần thiết cho deploy.

**Effort tổng**: ~10 phút

---

### 1.1 Verify Supabase project (1 phút)

Truy cập https://supabase.com/dashboard → Project `amplifyhd` → Đảm bảo:
- Status = Active
- Database không pause
- Region gần user (Singapore hoặc Tokyo)

---

### 1.2 Lấy Supabase API keys (3 phút)

Vào **Settings → API** trong Supabase Dashboard, copy 3 keys:

| Env Var | Lấy từ | Ghi vào |
|---------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (vd: `https://xxx.supabase.co`) | `.env.production` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key | `.env.production` |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` `secret` key ⚠️ BÍ MẬT | `.env.production` |

Tạo file `frontend/.env.production` với 3 keys trên.

---

### 1.3 Tạo TOKEN_ENCRYPTION_KEY (2 phút, OPTIONAL cho MVP)

Chạy trong terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy output vào `TOKEN_ENCRYPTION_KEY` trong `.env.production`.

**Optional** vì MVP không dùng OAuth tokens. Tạo sẵn để chuẩn bị cho Future Enhancements (LinkedIn, video).

---

### 1.4 Lấy GOOGLE_AI_API_KEY (2 phút)

Truy cập https://aistudio.google.com/apikey → **Create API key** → Chọn project Amplify → Copy key.

Ghi vào `.env.production`:

```
GOOGLE_AI_API_KEY=AIzaSy...
```

> **Không dùng Azure AI** — Gemini 2.5 Flash free tier (1500 req/day) đủ cho 50+ users MVP.

---

### 1.5 (Optional) Update `.env.example` cho team

Nếu làm việc nhóm, thêm `frontend/.env.example` (không chứa giá trị thật):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TOKEN_ENCRYPTION_KEY=
GOOGLE_AI_API_KEY=
NEXT_PUBLIC_APP_URL=https://amplifyhd.tech
```

---

**Exit criteria Phase 1**:
- File `frontend/.env.production` có đủ 5 keys (hoặc 4 nếu skip TOKEN_ENCRYPTION_KEY)
- File `.env.example` được commit (không có giá trị thật)
- Không commit `.env.production` lên Git (đã có trong `.gitignore`)

**Lưu ý bảo mật**:
- KHÔNG commit `.env.production` lên GitHub
- KHÔNG share `SUPABASE_SERVICE_ROLE_KEY` ra ngoài
- Sau khi có Vercel project (Phase 3), set keys vào Vercel Environment Variables, không để trong repo

---

## PHASE 2: Cấu hình Domain amplifyhd.tech

### 2.1 Domain đã mua

Domain `amplifyhd.tech` đã mua trên Namecheap.

### 2.2 Cấu hình DNS trên Namecheap

Sau khi deploy lên Vercel (Phase 3), Vercel sẽ cung cấp DNS configuration. Trong Namecheap → Advanced DNS:

**Cách 1 — Dùng Vercel Nameservers (Recommended)**:
1. Namecheap → Domain → Nameservers → Custom DNS
2. Điền: `ns1.vercel-dns.com` và `ns2.vercel-dns.com`
3. Vercel tự động quản lý SSL và DNS

**Cách 2 — Dùng CNAME (nếu không đổi nameservers)**:
| Type | Host | Value |
|------|------|-------|
| CNAME | www | cname.vercel-dns.com |
| A | @ | 76.76.21.21 |

**Chờ DNS propagate**: 5-30 phút (có thể đến 48 giờ toàn cầu).

### 2.3 Mua SSL

Namecheap tự động cung cấp free SSL qua Let's Encrypt (auto-renew).

---

## PHASE 3: Deploy lên Vercel

### 3.1 GitHub Setup

Đảm bảo code đã push lên GitHub (Vercel cần repo để deploy).

### 3.2 Tạo project mới trên Vercel

1. Truy cập https://vercel.com/new
2. Import GitHub repo `AI_maketing_da_kenh_web`
3. **Root Directory**: `frontend` (vì Next.js nằm trong thư mục `frontend`)
4. **Build Command**: `npm run build`
5. **Install Command**: `npm install`

### 3.3 Cấu hình Environment Variables trên Vercel

Trong Vercel Dashboard → Project → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` (từ Phase 1.2) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (từ Phase 1.2) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (từ Phase 1.2) |
| `TOKEN_ENCRYPTION_KEY` | Kết quả từ Phase 1.3 (optional) |
| `GOOGLE_AI_API_KEY` | Từ Phase 1.4 |
| `NEXT_PUBLIC_APP_URL` | `https://amplifyhd.tech` (sau khi có domain) |
| ~~`X_CLIENT_ID`~~ | ❌ Bỏ — Extension dùng DOM automation, không cần OAuth |
| ~~`X_CLIENT_SECRET`~~ | ❌ Bỏ — Không dùng X API |
| ~~`FACEBOOK_APP_ID`~~ | ❌ Bỏ — Không dùng Facebook Graph API |
| ~~`FACEBOOK_APP_SECRET`~~ | ❌ Bỏ — Không dùng Facebook Graph API |
| `INNGEST_EVENT_KEY` | (bỏ trống - optional, scheduler dùng DOM automation) |
| `INNGEST_SIGNING_KEY` | (bỏ trống - optional) |

### 3.4 Redeploy

Sau khi thêm domain (Phase 4), redeploy để `NEXT_PUBLIC_APP_URL` được cập nhật.

---

## PHASE 4: Cấu Hình Domain Trên Vercel

### 4.1 Thêm domain

Vercel Dashboard → Project → Settings → Domains:
- Thêm domain đã mua (ví dụ: `amplifyhd.tech`)
- Vercel sẽ hiển thị records cần thêm vào DNS

### 4.2 Cập nhật DNS ở Namecheap

Trong Namecheap → Advanced DNS:
- **A Record**: `@` → IP của Vercel (hoặc dùng CNAME)
- **CNAME**: `www` → `cname.vercel-dns.com`
- Hoặc đổi nameservers theo hướng dẫn của Vercel

### 4.3 Cập nhật NEXT_PUBLIC_APP_URL

Vercel Environment Variables → cập nhật `NEXT_PUBLIC_APP_URL` = `https://amplifyhd.tech`

---

## PHASE 5: Chrome Extension — Đưa lên Chrome Web Store

### 5.1 Đóng gói Extension

1. Mở Chrome → `chrome://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Pack extension**
4. Chọn thư mục `extension/` trong project
5. Upload lên Chrome Web Store ($5 one-time fee)

### 5.2 Cập nhật manifest cho production URL

Trước khi đóng gói, sửa `extension/manifest.json`:

```json
"content_scripts": [{
  "matches": [
    "https://amplifyhd.tech/*",
    "http://localhost:3000/*",
    "http://localhost:3001/*"
  ],
  "run_at": "document_start"
}]
```

Thêm host permission:
```json
"host_permissions": [
  "https://*.facebook.com/*",
  "https://*.x.com/*",
  "https://*.threads.net/*",
  "https://*.instagram.com/*",
  "https://*.amplifyhd.tech/*"
]
```

### 5.3 Hướng dẫn cài extension cho user

Sau khi upload lên Chrome Web Store:
1. User vào Chrome Web Store → Search "Amplify Auto Poster"
2. Click "Add to Chrome"
3. Mở extension → Nhập API URL (VD: `https://amplifyhd.tech`) + API Token

---

## PHASE 6: User Flow Đầy Đủ — End-to-End Test

**Prerequisite**: Phase 0 đã hoàn thành (5 bugs đã fix + manual test pass). Đặc biệt:
- Bug `sessionData` đã fix → Extension có Bearer token hợp lệ
- Bug `currentProcessingPost` đã fix → Automator đọc được task data
- Bug race condition đã fix → Retry logic hoạt động
- Endpoint `POST /targets` đã có → Tạo target mới không bị 405

### 6.1 Đăng ký & Đăng nhập

1. User vào `https://amplifyhd.tech`
2. Đăng ký tài khoản mới
3. Hoàn thành onboarding → Tạo Brand Vault đầu tiên

### 6.2 Tạo Content & Schedule

1. Dashboard → "Tạo bài mới"
2. Nhập URL/text → Chọn channels (X, Facebook, etc.)
3. AI sinh drafts → Review & edit
4. Click "Lên lịch" → Chọn thời gian
5. Draft được tạo trong `extension_tasks` với `status=pending`

### 6.3 Cài đặt & Kết nối Extension

1. Settings → Copy API Token
2. Cài extension từ Chrome Web Store
3. Mở extension popup → Nhập:
   - API URL: `https://amplifyhd.tech`
   - API Token: (paste từ step 1)
4. Click "Kết nối" → Extension poll task mỗi 60 giây

### 6.4 Auto-Post (Extension) — VERIFY BUGS ĐÃ FIX

Sau khi Phase 0 fix xong, verify:
1. Extension thấy task pending → Mở tab `facebook.com` (không bị 401 nhờ P0-1)
2. Inject script → Tự động gõ nội dung, upload ảnh (automator đọc được `currentProcessingPost` nhờ P0-3)
3. Click nút "Đăng" → Bài đăng thật trên Facebook/X
4. Extension gửi `postCompleted` → Cập nhật `extension_tasks.status = completed`
5. Nếu fail → `postFailed` trigger retry đúng (nhờ P0-4 fix race condition)

### 6.5 Tracking

1. Dashboard → Xem lịch sử đăng bài
2. Analytics → Thống kê thành công/thất bại

### 6.6 Verify các channel đều hoạt động

| Channel | URL pattern | Status |
|---------|-------------|--------|
| `x` | `x.com/{handle}/status` | Test post thử |
| `facebook-group` | `facebook.com/groups/{target_id}` | Test post thử |
| `facebook-personal` | `facebook.com/{handle}` | Test post thử |
| `threads` | `threads.net/@{handle}` | Test post thử |
| `instagram` | `instagram.com/{handle}` | Test post thử |

---

## PHASE 7: Kiểm Tra Toàn Diện

### 7.1 Manual Testing Checklist (87 items từ `tests/MANUAL_TESTING_RESULTS.md`)

Ưu tiên những items quan trọng nhất:

**Auth (7 items)** — Đăng ký, đăng nhập, logout, session timeout

**Brand Vault (11 items)** — Tạo vault, AI phân tích voice

**Content Generation (11 items)** — Tạo job từ URL/text, AI generate, edit, regenerate

**Extension Flow (5 items thêm)** — Đặc biệt quan trọng:
- [ ] Extension kết nối với API token đúng
- [ ] Extension nhận task từ `/api/extension/tasks`
- [ ] Facebook auto-post hoạt động
- [ ] X auto-post hoạt động
- [ ] Retry khi fail

**Scheduling (5 items)** — Lên lịch, cancel, calendar

### 7.2 Performance Check

- Page load < 3s trên trang chính
- AI content generation < 30s
- Extension poll responsive

---

## PHASE 8: Cấu Hình Bảo Mật & Monitoring

### 8.1 Supabase Row Level Security

Kiểm tra trong Supabase Dashboard → Table Editor → Mỗi table → Policies:
- Tất cả tables phải có RLS enabled
- User chỉ đọc/ghi data của chính mình

### 8.2 Vercel Analytics (tùy chọn)

Bật Vercel Analytics trong project settings để theo dõi performance.

### 8.3 Error Tracking (tùy chọn)

Có thể thêm Sentry.io (free tier) để tracking lỗi production.

---

## Thứ Tự Thực Hiện

**Phase 0 (fix bugs, ~25 phút) — TRƯỚC TIÊN**:
```
Bước 1 → P0-1: Fix `sessionData` → `localData` (~2 phút)
Bước 2 → P0-2: Fix SchedulerCalendar colors (~5 phút)
Bước 3 → P0-3: Fix `currentProcessingPost` key sync (~5 phút)
Bước 4 → P0-4: Fix race condition `await` trong postFailed (~2 phút)
Bước 5 → P0-5: Implement POST /api/extension/targets (~10 phút)
Bước 6 → P0-6: Manual test extension end-to-end (~15 phút)
```

**Phase 1 (thu thập keys, ~10 phút)**:
```
Bước 7  → 1.1: Verify Supabase project Active (~1 phút)
Bước 8  → 1.2: Lấy 3 Supabase API keys (~3 phút)
Bước 9  → 1.3: Tạo TOKEN_ENCRYPTION_KEY (~2 phút, optional)
Bước 10 → 1.4: Lấy GOOGLE_AI_API_KEY (~2 phút)
Bước 11 → 1.5: Update .env.example cho team (~2 phút)
```

**Phase 3 (deploy Vercel, ~20 phút)**:
```
Bước 12 → 3.1-3.2: Tạo Vercel project + import GitHub (~5 phút)
Bước 13 → 3.3: Cấu hình Environment Variables trên Vercel (~10 phút)
Bước 14 → 3.4: Deploy lần đầu, lấy preview URL (~3 phút)
```

**Phase 4 (domain, ~5-30 phút chờ propagate)**:
```
Bước 15 → 4.1-4.2: Thêm domain trên Vercel + cập nhật DNS Namecheap (~5 phút setup)
Bước 16 → 4.3: Update NEXT_PUBLIC_APP_URL + redeploy (~3 phút)
[CHỜ]  → DNS propagate (5-30 phút, có thể đến 48 giờ toàn cầu)
```

**Phase 5 (Chrome Web Store, ~30 phút)**:
```
Bước 17 → 5.1: Đóng gói extension (~5 phút)
Bước 18 → 5.2: Upload lên Chrome Web Store (~$5 one-time, ~20 phút review)
Bước 19 → 5.3: Hướng dẫn user cài extension (~5 phút)
```

**Phase 6-8 (testing & monitoring, ~1-2 giờ)**:
```
Bước 20 → Phase 6: E2E test user flow (~30 phút)
Bước 21 → Phase 7: Manual testing 87 items (~1 giờ, ưu tiên Extension flow)
Bước 22 → Phase 8: Verify RLS + bật Vercel Analytics (~15 phút)
```

**Tổng effort (không tính DNS propagate + Chrome Web Store review)**: ~2.5-3 giờ

**Lưu ý**:
- Sau Phase 0 PHẢI commit code lên GitHub trước khi làm Phase 3 (Vercel cần repo)
- Phase 2 (DNS) phải làm TRƯỚC hoặc SAU Phase 3 đều được, nhưng làm SAU thì preview URL dùng tạm được
- Chrome Web Store review mất ~1-3 ngày, có thể đợi hoặc test extension local trước

---

## Công Việc KHÔNG Cần Làm Trong Phase 1

- ❌ X/Facebook Developer OAuth apps (không cần vì Extension dùng DOM automation)
- ❌ Inngest production setup (scheduler worker cần OAuth tokens — không dùng trong Phase 1)
- ❌ Server-side rate limiting (Cloudflare WAF) — có thể thêm sau
- ❌ Multi-user/team collaboration
- ❌ Video generation
- ❌ Mobile app

---

## Future Enhancements — Azure (Student Credits) + Bug Tracking

### Azure (Student Credits)

Các tính năng dưới đây **KHÔNG implement trong MVP**. Có thể dùng Azure Student Credits ($100) trong tương lai nếu cần:

| Azure Service | Mục đích | Khi nào nên dùng |
|---------------|----------|------------------|
| **Azure AI Foundry** | Thay Gemini bằng GPT-4 / Claude / model mạnh hơn | Khi cần chất lượng content vượt trội Gemini 2.5 Flash |
| **Azure OpenAI Service** | GPT-4 cho content generation | Sau khi MVP có 50+ users và cần upgrade quality |
| **Azure Blob Storage** | Lưu trữ ảnh/video lớn (thay base64 trong DB) | Khi user upload ảnh >500KB thường xuyên |
| **Azure Functions** | Thay thế Inngest (background jobs) | Khi muốn bỏ dependency Inngest |
| **Azure Static Web Apps / App Service** | Thay Vercel | Khi cần kiểm soát hosting hoàn toàn (không recommend) |
| **Azure CDN / Front Door** | CDN tối ưu cho media | Khi traffic tăng cao |
| **Azure Key Vault** | Lưu TOKEN_ENCRYPTION_KEY an toàn hơn | Khi cần compliance / audit |

**Tại sao không dùng cho MVP**:
- Gemini free tier (1500 req/ngày) đủ cho 50+ users
- Base64 ảnh trong DB hoạt động tốt cho ảnh nhỏ
- Vercel miễn phí + auto-deploy + CDN toàn cầu tốt hơn Azure App Service cho Next.js
- Thêm Azure = thêm complexity, không có lợi rõ rệt cho MVP

**Khuyến nghị**: Giữ Azure credits để học và thử nghiệm Azure services, không integrate vào MVP.

### 🐛 Bug Tracking — Không Fix Trong MVP

Những bug sau được phát hiện qua phân tích webapp ↔ Extension nhưng **KHÔNG chặn core flow**, ghi vào Future Enhancements:

| # | Bug | File | Mức độ |
|---|-----|------|--------|
| 1 | Webapp → Extension instant trigger qua WebSocket (thay vì polling 1 phút) | — | MEDIUM |
| 2 | Token auto-sync qua postMessage (extension đã có listener, webapp chưa gọi) | `extension/content/inject.js` | LOW |
| 3 | LinkedIn automator (README list nhưng không có file) | `extension/automators/` | LOW |
| 4 | Image upload (không phải URL array) | `extension_tasks.images` | MEDIUM |
| 5 | Fix hash computation 2 lần trong `/api/extension/status` route | `frontend/app/api/extension/status/route.ts:8-14` | LOW |
| 6 | Add timeout cho `chrome.runtime.sendMessage` trong image fetch | `extension/automators/fb-group.js:59` | MEDIUM |

**Team collaboration**:
- ❌ Multi-user / team workspaces
- ❌ Competitive intelligence
- ❌ Video generation
- ❌ Advanced AI models (GPT-4, Claude)
- ❌ Public API
- ❌ Mobile native app
- ❌ White-label options
