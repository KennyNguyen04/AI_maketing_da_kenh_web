# Manual Test: Chrome Extension Connect Flow

## Prerequisites
- Dev server đang chạy: `cd frontend && npx next dev --port 3000`
- Chrome browser
- Extension đã load unpacked từ `extension/` folder

## Steps

### 1. Tạo API key mới qua web UI
1. Mở Chrome → http://localhost:3000/login
2. Login với account của bạn
3. Vào Settings/API Token → Generate new token
4. Copy token (format: `amp_xxxxxxxx...`)

### 2. Verify token có prefix trong DB
Mở Supabase SQL Editor:
```sql
SELECT key_prefix, LENGTH(key_hash) as hash_len, created_at
FROM api_keys ORDER BY created_at DESC LIMIT 1;
```
**Expected:** key_prefix = 8 ký tự đầu của token, hash_len = 97

### 3. Connect extension
1. Click icon extension trên Chrome toolbar
2. Popup mở ra
3. Paste token vào field "API Token"
4. API Base: `http://localhost:3000`
5. Click "Lưu & Kết nối"
6. **Expected:**
   - Status chuyển sang "✅ Đã kết nối"
   - Stats hiện: `Hàng chờ: 0`, `Hôm nay: 0`, `Tổng: 0`

### 4. Verify popup đọc stats từ /status
Mở DevTools của popup (right-click popup → Inspect):
1. Tab Network
2. Click refresh / mở lại popup
3. Tìm request: `GET http://localhost:3000/api/extension/status`
4. **Expected:**
   - Status: 200
   - Response body: `{ ok: true, user_id: "...", pending_tasks: N, completed_today: N, completed_total: N, timestamp: "..." }`
   - Popup DOM hiển thị đúng số từ response

### 5. Test extension poll tasks
1. Tạo 1 task pending qua web UI (qua UI draft → schedule → publish)
2. Hoặc insert thủ công qua SQL:
   ```sql
   INSERT INTO extension_tasks (user_id, channel, content, scheduled_for, status)
   VALUES ('<your-user-id>', 'facebook', 'Test from manual test',
           NOW(), 'pending');
   ```
3. Đợi ≤ 1 phút (extension poll mỗi phút)
4. Vào `chrome://extensions` → find "Amplify Auto Poster" → Service Worker → Console
5. **Expected logs:**
   ```
   [Amplify] Processing task {id} on facebook in tab {tabId}
   ```
6. Tab Facebook tự động mở

### 6. Verify popup stats update real-time
Quay lại popup:
- **Expected:** `Hàng chờ` count giảm (vì task đã processing)

### 7. Test multi-user isolation
1. Tạo account thứ 2 (vd qua incognito)
2. Generate API key cho user 2
3. Trong popup hiện tại (đang connect user 1), paste token của user 2
4. Click "Lưu & Kết nối"
5. **Expected:**
   - Stats hiển thị data của user 2
   - Network tab request `/status` trả user_id của user 2

## Troubleshooting

### Popup không connect được
- Check token có đúng format `amp_...`
- Check DevTools console: xem log "Invalid token" hay "Unauthorized"
- Check backend logs: xem request có hit `/status` không

### Stats luôn = 0
- Có thể popup dùng code cũ (cache). Reload extension: `chrome://extensions` → toggle off/on

### Extension không poll tasks
- Service Worker có thể bị Chrome suspend. Mở `chrome://extensions` → Service Worker → kiểm tra "Active" badge

## Cleanup sau test

Xóa các test tasks:
```sql
DELETE FROM extension_tasks WHERE content LIKE '%test%' OR content LIKE '%Test%';
```

Xóa legacy malformed key (optional):
```sql
DELETE FROM api_keys WHERE LENGTH(key_hash) < 50;
```
