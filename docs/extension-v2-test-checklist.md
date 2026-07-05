# Extension v2 — Test Checklist

Tài liệu này là checklist thủ công để verify các fix/feature trong plan `amplify_extension_v2_plan`. Tick ✅ khi pass, ❌ khi fail.

> **Cách test nhanh:** mỗi mục ghi rõ file + line, đọc code trước khi chạy. Nếu tick xong vẫn không chạy đúng → xem logs console.

---

## Phase 0 — Production Critical Fixes

### 0.1 humanTypeText thực sự insert text

- [ ] Mở `extension/automators/fb-personal.js` dòng 98 — function `humanTypeText(editor, text)` phải gọi `AD.humanType(editor, text, 60)` chứ KHÔNG chỉ `sleep(...)`.
- [ ] Mở `extension/automators/fb-group.js` dòng ~101 — function giống vậy.
- [ ] Mở `extension/automators/threads.js` dòng ~120 — function đặt ở NGOÀI try block, không lẫn vào giữa images loop.
- [ ] Manual: Schedule 1 bài FB → bài đăng có TEXT đầy đủ, không trống.

### 0.2 Brace fix trong fb-personal.js

- [ ] `node -c extension/automators/fb-personal.js` (terminal) → no error.
- [ ] Mở file dòng ~131: `if (images.length === 0)` phải có `{ throw ...; }` đóng, KHÔNG có code leak ra ngoài.

### 0.3 threads.js restructure

- [ ] `node -c extension/automators/threads.js` → no error.
- [ ] Mở file: function `humanTypeText` đứng ngoài try, không nằm giữa `let images = []` và `if (images.length === 0)`.

### 0.4 Silent 401

- [ ] `extension/background.js` dòng ~124: check `if (response.status === 401)` set `tokenExpired: true`.
- [ ] Manual: đổi token trong storage thành giá trị rác → click Lưu → popup hiển thị "Token hết hạn".

### 0.5 TRUSTED_ORIGINS có vercel.app

- [ ] `extension/content/inject.js` dòng ~11: `TRUSTED_ORIGINS` có `'https://amplify-eight-drab.vercel.app'`.
- [ ] Manual: mở vercel.app → "Kết nối Extension" → token lưu thành công.

### 0.6 manifest.json content_scripts

- [ ] `extension/manifest.json` content_scripts.matches có `https://amplify-eight-drab.vercel.app/*`.
- [ ] Validate: `JSON.parse(fs.readFileSync('extension/manifest.json'))` exit 0.

### 0.7 Smoke test (full chain)

- [ ] Extension load không có error console.
- [ ] Vào vercel.app → "Kết nối Extension" button active.
- [ ] Save token → popup "✅ Đã kết nối".
- [ ] Schedule 1 bài FB → extension poll thấy task.
- [ ] Bài đăng FB có TEXT đầy đủ.
- [ ] Schedule 1 bài Threads → đăng OK.
- [ ] Đổi token rác → popup "Token hết hạn".

---

## Phase 1 — Coupling Issues

### 1.1 PATCH status validation mở rộng

- [ ] `frontend/app/api/extension/tasks/[taskId]/route.ts`: `ALLOWED_STATUSES` array có 4 phần tử (`completed, failed, pending, processing`).
- [ ] KHÔNG có `cancelled` trong đó (cancel endpoint riêng).

### 1.2 post_url → target_id không bị pollute

- [ ] Cùng file dòng ~25: KHÔNG có dòng `if (post_url) updates.target_id = post_url`.
- [ ] `post_url` chỉ được log ra console, không update DB.

### 1.3 Recovery preserve post data

- [ ] `extension/background.js` dòng ~16-29: `onInstalled` đọc cả `currentProcessingPost`.
- [ ] error_message có format `'Extension restarted during posting (post_id: ...)'`.

### 1.4 Backend limit=1

- [ ] `frontend/app/api/extension/tasks/route.ts`: filter returns exactly 1 task per request.

### 1.5 Column type consistency

- [ ] `extension_tasks.images` type = `TEXT[]` (xem migration 002).
- [ ] `frontend/app/api/schedule/[draftId]/route.ts` dòng ~108: `images: draft.images || []`.

### 1.6 POST endpoint orphan đã xóa

- [ ] `frontend/app/api/extension/tasks/route.ts`: KHÔNG còn `export async function POST`.
- [ ] Chỉ còn GET handler.

---

## Phase 3 — Tier 1 Features

### 3.1 Rate Limit

**Backend:**
- [ ] `migrations/018_extension_user_settings.sql` tạo bảng với `rate_limits JSONB`, `auto_preview`, `preview_delay_seconds`.
- [ ] `frontend/app/api/extension/settings/route.ts`: GET trả về current settings + defaults.
- [ ] `frontend/app/api/extension/settings/route.ts`: PATCH upsert thành công.
- [ ] `frontend/app/api/extension/tasks/route.ts` GET handler filter theo perDay + minIntervalS.
- [ ] Disabled channel (`enabled: false`) → tasks KHÔNG bị skip.

**Extension UI:**
- [ ] Popup tab "⚙️ Giới hạn" hiển thị 5 channels với slider.
- [ ] Edit + Save → DB sync.
- [ ] Toggle "Bật" → channel đó bị skip trong poll.

**Smoke test:**
- [ ] Set Facebook perDay=2 → đăng bài thứ 3 → bị skip.
- [ ] Set xong chờ 1 task cũ qua ngày → count reset.

### 3.2 Re-post

**Backend:**
- [ ] `frontend/app/api/extension/repost/route.ts`: GET trả danh sách drafts published.
- [ ] POST insert extension_tasks mới với channel cách nhau 60s.

**Extension UI:**
- [ ] Popup tab "🔄 Đăng lại" hiển thị list drafts.
- [ ] Click channel button → POST /api/extension/repost → DB có row mới.

**Smoke test:**
- [ ] Draft có content "Hello world" → click "📘 FB" → extension_tasks row mới với content "Hello world".
- [ ] Multi-channel click → N rows scheduled_for cách nhau 60s.

### 3.3 Preview

**Backend:**
- [ ] `frontend/app/api/extension/cancel/route.ts`: POST mark `cancelled`, lưu reason vào error_message.
- [ ] `extension_user_settings.auto_preview` PATCH thành công.

**Extension UI:**
- [ ] Popup tab "👁️ Preview" có toggle + delay input.
- [ ] Toggle ON + delay=10s → next task → popup mở với countdown.
- [ ] Click "✅ Đăng ngay" → tab mở, bài đăng OK.
- [ ] Click "❌ Hủy" → task mark `cancelled` trong DB.
- [ ] Toggle OFF → popup KHÔNG mở, post trực tiếp.

---

## Manual test pass criteria

- [ ] Tất cả 7 mục Phase 0 pass.
- [ ] Tất cả 6 mục Phase 1 pass.
- [ ] Tất cả 14 mục Phase 3 pass.
- [ ] Không có bug mới nào xuất hiện ở edge case (extension reload giữa chừng, network timeout, token expired khi post đang chạy).

---

## Known Limitations (ghi nhận, không fix)

- Settings chỉ sync giữa extension + DB, KHÔNG có UI webapp (chưa cần).
- Preview countdown dùng `Date.now()` của client → có thể lệch 1-2s nếu user đổi clock.
- Cancel không gửi retry notification nếu gặp transient network error.
- Re-post KHÔNG clone target_id từ draft gốc nếu draft gốc không có.
