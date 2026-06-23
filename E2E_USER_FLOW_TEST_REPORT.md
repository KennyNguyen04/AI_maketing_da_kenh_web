# Bao cao test E2E nguoi dung cuoi - Amplify

Ngay test: 14/06/2026
Moi truong: local production server `http://127.0.0.1:3000`
Cong cu: Codex in-app Browser, PowerShell smoke checks
Vai tro: nguoi dung cuoi binh thuong, plan `free`

## 1. Ket luan ngan

Lan test nay da di qua duoc login that, onboarding, Brand Vault, dashboard, tao job, Inngest worker local, Review, Mark done, Settings social va admin guard.

Ket qua tong quat:

- PASS: Supabase Auth reachable, user test login duoc.
- PASS: Brand Vault cold-start form tao vault va save thanh cong.
- PASS: Dashboard nhan Brand Vault active va hien job history.
- PASS: Tao job repurpose tu UI thanh cong, record vao database.
- PASS sau khi fix runtime: Inngest Dev Server sync duoc app khi restart Next voi `INNGEST_DEV=1`.
- PASS: Worker xu ly job, sinh 2 drafts, dashboard hien `Done`, mo duoc Review.
- PARTIAL PASS: Review tabs, Facebook prepare modal va Mark done hoat dong.
- ISSUE: Copy/autosave edit bi anh huong boi Browser virtual clipboard; copy UI khong tang counter trong lan test nay.
- PASS: Settings social hien X/Facebook connect va bao loi cau hinh thieu ro rang.
- PASS: User free bi chan khoi `/admin`.
- FAIL: `/api/health` tra `401 Unauthorized` khi goi khong co session, chua phu hop vai tro health check production.

## 2. Tai khoan va du lieu test

Tai khoan test da duoc tao trong Supabase Auth:

- Email: `amplify.e2e.1781426343677@example.com`
- Ho ten hien thi: `Amplify E2E User`
- Plan hien thi trong UI: `free`

Khong ghi token/session vao bao cao.

## 3. Dieu kien chay thuc te

Da khoi dong Next.js production server tu thu muc `frontend`:

```bash
npm run start
```

Server dang lang nghe:

```text
http://127.0.0.1:3000
```

Inngest CLI da duoc thu khoi dong bang:

```bash
npx inngest-cli@latest dev -u http://127.0.0.1:3000/api/inngest
```

Sau khi tiep tuc debug, Inngest UI da cho thay app sync loi:

```text
Expected server kind cloud, got dev
```

Nguyen nhan: server Next chay bang `next start` nen `NODE_ENV=production`, trong khi `.env.local` co production Inngest keys. SDK suy luan cloud mode, con Inngest Dev Server goi endpoint theo dev mode.

Da restart Next server voi:

```powershell
$env:INNGEST_DEV='1'
npm run start
```

Ket qua sau restart:

- `/api/inngest` tra `200`.
- Inngest UI sync app `amplify`.
- Tim thay 3 functions.
- Gui lai event `repurpose/start` cho job UI da tao.
- Job chuyen `pending` -> `done`.
- Sinh 2 drafts.

## 4. Bang ket qua test that

| ID | Luong | Ket qua | Bang chung / ghi chu |
|---|---|---|---|
| E2E-01 | Local app server | PASS | Port `3000` lang nghe bang Node that tu `C:\Program Files\nodejs\node.exe`. |
| E2E-02 | Supabase host reachable | PASS | Direct auth password grant tra status 200 cho user test. |
| E2E-03 | Login UI | PASS | `/login` render email/password va submit duoc. |
| E2E-04 | Login thanh cong | PASS | Browser vao duoc `/dashboard`, sidebar hien user `Amplify E2E User`, plan `free`. |
| E2E-05 | Dashboard khi chua co Brand Vault | PASS | Hien CTA setup Brand Vault va stats ban dau. |
| E2E-06 | Brand Vault text flow | BLOCKED/ISSUE | Chon `Paste text`, nhap noi dung, bam analyze nhung UI quay ve mode URL va khong di tiep. Flow nay phu thuoc Inngest. |
| E2E-07 | Brand Vault cold-start form | PASS | Dien topics, tone, audience, style, samples; submit tao vault. |
| E2E-08 | Confirm Brand Vault | PASS | Vao `/onboarding/confirm?vaultId=...`, hien tone/topics/signature phrases/avoid. |
| E2E-09 | Save Brand Vault | PASS | Bam `Save Brand Vault`, redirect ve `/dashboard`; dashboard hien `My Brand Voice` active. |
| E2E-10 | Create content page | PASS | `/dashboard/new` load form sau khi co Brand Vault active. |
| E2E-11 | Submit repurpose job | PARTIAL PASS | Nhap source text, chon Facebook + X, title `E2E Social Distribution Test`; dashboard hien 1 job moi. |
| E2E-12 | Background processing | PASS SAU FIX RUNTIME | Restart Next voi `INNGEST_DEV=1`, Inngest sync 3 functions, resend event, job chuyen `done`. |
| E2E-13 | Dashboard job history | PASS | Hien job `E2E Social Distribution Test`, source text, 2 kenh, status `Hoan thanh / Done`, nut `Xem / View`. |
| E2E-14 | Settings social | PASS | `/settings` hien X/Twitter va Facebook Page, moi provider co nut `Connect`. |
| E2E-15 | X connect without env | PASS | Bam Connect X hien `X OAuth is not configured`, khong crash. |
| E2E-16 | Facebook connect without env | PASS | Bam Connect Facebook hien `Facebook OAuth is not configured`, khong crash. |
| E2E-17 | Admin guard free user | PASS | `/admin` hien `Khong co quyen truy cap`; user free khong vao duoc panel. |
| E2E-18 | Health endpoint anonymous | FAIL | `GET /api/health` tra `401 Unauthorized`; health endpoint dang bi middleware/auth chan. |
| E2E-19 | Review page | PASS | Mo `/review/[jobId]`, hien source panel, tabs, editor, distribution panel. |
| E2E-20 | Switch draft tab | PARTIAL PASS | Chuyen LinkedIn Post -> LinkedIn Thread duoc, nhung UI hien `Dang luu...` va khong het. |
| E2E-21 | Copy draft | ISSUE | Bam `Sao chep / Copy`, Browser clipboard bao virtual clipboard missing; counter van `0 copied`. Can test lai bang browser thu cong. |
| E2E-22 | Facebook prepare modal | PASS | Bam `Prepare Facebook`, modal preview mo, hien `Copy + Open`, `Publish Page`, va fallback khi chua co Page. |
| E2E-23 | Mark done | PASS | Bam `Mark as done`, nut doi thanh `Completed`, toast success; DB xac nhan 2 drafts `is_done=true`. |

## 5. Luong hoat dong web app da quan sat

### 5.1 Login

Nguoi dung vao `/login`, nhap email/password va bam `Dang nhap / Sign in`.

Ket qua thuc te:

- Auth thanh cong.
- App dieu huong vao `/dashboard`.
- Sidebar hien avatar chu cai `AM`, ten `Amplify E2E User`, plan `free`.

Ghi chu: loi login treo truoc do den tu server bi khoi dong trong moi truong bi han che network. Khi khoi dong Next server ngoai sandbox, login di qua duoc.

### 5.2 Dashboard ban dau

Sau login, dashboard hien:

- Greeting.
- CTA `Tao noi dung moi / Create new`.
- Trang thai chua cau hinh Brand Vault.
- Nut `Thiet lap ngay / Setup now`.
- Stats: completed 0, total repurposed 0, drafts 0.

Nguoi dung bam setup, wizard Brand Vault xuat hien ngay trong layout app.

### 5.3 Brand Vault

Co 2 nhom flow:

1. `Toi co bai viet san`: URL/text.
2. `Toi chua co gi`: cold-start form.

Ket qua flow URL/text:

- Chon `Dan text / Paste text` duoc.
- Nhap text hon 50 ky tu thi nut `Phan tich giong van / Analyze voice` enable.
- Sau khi submit, flow khong toi confirm trong thoi gian test.
- UI quay lai mode URL voi nut analyze disabled.
- Day la issue can sua/kiem tra cung Inngest worker.

Ket qua flow cold-start form:

- Dien topics, audience, sample sentences.
- Chon tone `Truc tiep / Direct`.
- Chon style `Hon hop / Mixed`.
- Nut `Tao Brand Vault / Create Brand Vault` enable.
- Submit xong co man hinh loading.
- Sau do redirect toi confirm page.
- Confirm page hien tone, topics, signature phrases, avoid list, sentence style.
- Bam `Luu Brand Vault / Save Brand Vault` thanh cong.
- Dashboard hien `My Brand Voice`, active.

Issue UX quan sat:

- Trong qua trinh submit form co mot flash quay lai form va alert co noi dung heading, roi moi redirect sang confirm. Chua block flow, nhung gay cam giac rung/khong on dinh.

### 5.4 Tao noi dung

Nguoi dung vao `/dashboard/new`.

Form hien:

- Brand Vault: `My Brand Voice`, active.
- Source content textarea.
- Channel buttons: LinkedIn Post, LinkedIn Thread, Facebook Post, X/Twitter.
- Title optional.
- Nut `Tao noi dung / Generate content`.

Du lieu da submit:

- Source type: text.
- Channels: Facebook + X/Twitter.
- Title: `E2E Social Distribution Test`.

Ket qua ban dau:

- UI chuyen sang man `AI dang tao noi dung...`.
- Dashboard sau do hien job moi.
- Status job: `Pending`.
- Draft count van la 0.

Sau khi restart Next voi `INNGEST_DEV=1` va sync Inngest:

- Event `repurpose/start` duoc worker xu ly.
- Job chuyen sang `done`.
- Dashboard stats cap nhat:
  - Completed: 1
  - Total repurposed: 1
  - Drafts created: 2
- Dashboard hien nut `Xem / View`.

Ket luan:

- Frontend create-job va DB insert da qua.
- Background worker qua khi local server duoc chay dung Inngest dev mode.
- Can them huong dan setup `INNGEST_DEV=1` cho local production test.
- Issue moi: user da chon Facebook + X tren UI, nhung drafts sinh ra la `linkedin_post` va `linkedin_thread`. Can kiem tra state/default channel selection hoac payload tao job.

### 5.5 Review va publish

Da test duoc bang draft that sau khi worker chay.

UI Review hien:

- `/review/[jobId]`
- Draft tabs theo channel.
- Draft editor.
- Autosave sau khi sua.
- Copy.
- Regenerate.
- Mark done.
- Distribution panel:
  - `Publish to X`
  - `Prepare Facebook`
  - Facebook modal voi `Copy + Open` va `Publish Page`

Trang thai test:

- PASS: Mo review tu dashboard bang nut `Xem / View`.
- PASS: Switch tab LinkedIn Post -> LinkedIn Thread.
- ISSUE: Sau khi switch tab, trang thai autosave hien `Dang luu...` va khong tu het trong thoi gian quan sat.
- ISSUE/TOOL LIMIT: Copy bi loi Browser virtual clipboard, can test lai thu cong trong Chrome/Edge that.
- PASS: Facebook prepare modal mo preview va fallback controls.
- PASS: Mark done cap nhat UI va DB.

### 5.6 Settings social

Nguoi dung vao `/settings`.

UI hien:

- X / Twitter card.
- Facebook Page card.
- Moi card co nut `Connect`.
- Chua co account ket noi.

Ket qua khi bam:

- X: hien `X OAuth is not configured`.
- Facebook: hien `Facebook OAuth is not configured`.

Ket luan:

- UX an toan khi thieu env.
- Chua test OAuth/publish that vi thieu client id/secret/redirect URI va chua co draft.

### 5.7 Admin Alpha Panel

Nguoi dung free vao `/admin`.

Ket qua:

- Hien heading `Khong co quyen truy cap`.
- Mo ta: Admin Alpha Panel chi danh cho tai khoan admin.

Ket luan:

- Guard quyen admin cho user free PASS.
- Chua test admin list users/failed jobs/retry/export vi chua co admin session.

## 6. Bug/blocker can sua truoc vong test tiep

### P0 - Local Inngest phai chay voi dev mode ro rang

Trieu chung ban dau:

- Sau khi tao job, man hinh loading `AI dang tao noi dung...` keo dai.
- Dashboard hien job moi status `Pending`.
- Draft count = 0.
- Inngest UI hien app error: `Expected server kind cloud, got dev`.

Anh huong:

- Neu khong fix, job khong duoc worker xu ly va khong tao draft.

Huong xu ly:

- Chay Inngest Dev Server trong terminal rieng:

```bash
cd frontend
npx inngest-cli@latest dev -u http://127.0.0.1:3000/api/inngest
```

- Khi dung `next start` local, start Next voi:

```powershell
$env:INNGEST_DEV='1'
npm run start
```

- Dam bao Inngest UI hien:
  - app `amplify`
  - SDK `v3.54.2`
  - 3 functions:
  - `analyze-brand-vault-text`
  - `analyze-brand-vault-url`
  - `repurpose-content`
- Sau do tao job va quan sat status tu `pending` -> `processing` -> `done`.

### P1 - Channel selection mismatch

Trieu chung:

- Trong UI create job, tester chon Facebook + X/Twitter.
- Dashboard hien 2 kenh nhung pill lai la `LI`, `LI`.
- Drafts sinh ra trong DB la:
  - `linkedin_post`
  - `linkedin_thread`

Anh huong:

- User co the nhan draft sai kenh so voi lua chon.
- Social distribution v1 cho Facebook/X khong test duoc dung muc tieu neu payload bi sai.

Huong xu ly:

- Kiem tra state mac dinh trong create form.
- Kiem tra click channel button co toggle dung `facebook`/`twitter` khong.
- Kiem tra payload `channels` gui len `/api/jobs`.
- Them test UI/API cho channel selection.

### P1 - Review autosave stuck sau khi switch tab

Trieu chung:

- Mo Review.
- Switch tu LinkedIn Post sang LinkedIn Thread.
- UI hien `Dang luu...` va khong het sau vai giay.

Anh huong:

- User co the nghi noi dung dang save mai.
- Co nguy co autosave patch nham draft khi `draft.content`/local state thay doi luc switch tab.

Huong xu ly:

- Review lai `DraftEditor` effect autosave.
- Khi `draft.id` thay doi, reset `status='idle'` va khong trigger autosave cho content moi.
- Them test switch tab khong goi PATCH.

### P2 - Copy can retest thu cong

Trieu chung:

- Bam `Sao chep / Copy`.
- In-app Browser bao virtual clipboard missing.
- Counter van `0 copied`.

Anh huong:

- Chua ket luan duoc copy bug cua app hay gioi han Browser automation.

Huong xu ly:

- Test lai bang browser that/manual.
- Neu van fail, thay `navigator.clipboard.writeText` bang fallback hoac hien loi copy ro rang.

### P1 - Text/URL Brand Vault flow reset UI

Trieu chung:

- Chon Paste text, nhap noi dung, submit.
- Sau khi cho, UI quay ve mode URL va analyze disabled.
- Khong co thong bao loi ro.

Anh huong:

- User khong biet dang pending, failed hay bi reset.

Huong xu ly:

- Hien job/vault processing state co timeout/error.
- Neu Inngest khong active, API/UI nen bao loi ro thay vi polling mai.
- Giu mode/text value khi co loi.

### P1 - `/api/health` bi auth chan

Trieu chung:

```text
GET /api/health -> 401 Unauthorized
```

Anh huong:

- CI/CD, uptime monitor, deployment platform khong check duoc app health neu khong co session.

Huong xu ly:

- Exclude `/api/health` khoi middleware auth.
- Hoac implement health bang service/admin client va public response toi thieu:

```json
{ "status": "ok", "db": "connected" }
```

### P2 - Social OAuth thieu env

Trieu chung:

- X connect: `X OAuth is not configured`.
- Facebook connect: `Facebook OAuth is not configured`.

Anh huong:

- Chua test OAuth connect/publish that.

Can bo sung:

```text
TOKEN_ENCRYPTION_KEY
X_CLIENT_ID
X_CLIENT_SECRET
X_REDIRECT_URI
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
FACEBOOK_REDIRECT_URI
```

### P2 - Can admin test account

Can co user voi:

```text
profiles.user_plan = 'admin'
```

De test:

- `/admin`
- Users table
- Failed jobs
- Retry failed job
- Feedback CSV export

## 7. Checklist test lai sau khi fix Inngest

1. Start app server.
2. Start Inngest Dev Server va xac nhan functions duoc discover.
3. Login bang user test.
4. Tao job moi tu `/dashboard/new`.
5. Xac nhan dashboard status di tu pending/processing sang done.
6. Bam `Xem / View` trong dashboard.
7. Test review:
   - Switch Facebook/X tabs.
   - Sua draft va doi autosave.
   - Reload review page, xac nhan noi dung van con.
   - Copy draft.
   - Regenerate draft.
   - Mark done.
8. Test social panel:
   - X draft <= 280 ky tu thi nut Publish to X enable neu co X account.
   - X draft > 280 ky tu bi chan.
   - Prepare Facebook mo modal preview.
   - Copy + Open fallback ghi publish_attempts mode draft/handoff.
9. Test admin bang admin user:
   - List users.
   - List failed jobs.
   - Retry failed job.
   - Export feedback CSV.

## 8. Trang thai cuoi vong test

Vong test nay da xac nhan webapp khong con bi chan o login. Luong nguoi dung co the vao dashboard, thiet lap Brand Vault bang form, tao job, chay worker khi local Inngest duoc cau hinh dung, mo Review, xem drafts, mo Facebook distribution modal va mark done.

Blocker lon nhat ban dau cua background processing da duoc giai thich va co workaround: restart Next voi `INNGEST_DEV=1`. Cac rui ro con lai truoc khi ket luan san pham san xuat va phan phoi noi dung end-to-end la channel selection mismatch, autosave stuck khi switch tab, OAuth social chua co env, va `/api/health` dang bi auth chan.
