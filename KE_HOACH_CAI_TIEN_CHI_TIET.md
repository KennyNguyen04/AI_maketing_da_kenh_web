# Kế Hoạch Cải Tiến Amplify AI Marketing

## Mục tiêu

Cải tiến dự án Amplify AI Marketing hiện tại bằng cách kế thừa các kỹ thuật từ Auto Post MUT (extension MV3) để nâng cao khả năng auto-posting và multi-platform support.

---

## Phần 1: Phân Tích Hiện Trạng

### 1.1 Dự án hiện tại (Amplify MVP)

| Thành phần | Công nghệ | Trạng thái |
|------------|-----------|------------|
| Frontend | Next.js 15, React, Tailwind | ✅ Hoàn thiện |
| Backend | Next.js API Routes | ✅ Hoàn thiện |
| Database | Supabase (PostgreSQL) | ✅ Hoàn thiện |
| Background Jobs | Inngest | ✅ Hoàn thiện |
| AI Content | Google Gemini | ✅ Hoàn thiện |
| Social API - X | X API v2 | ✅ Hoạt động |
| Social API - FB | Facebook Graph API | ✅ Hoạt động |
| Scheduling | Inngest cron 5 phút | ✅ Hoạt động |
| Rate Limiting | X: 50/6h, FB: 25/24h | ✅ Hoạt động |
| Brand Vault | URL scraping, text analysis | ✅ Hoạt động |

### 1.2 Các tính năng đã có

```
✅ Dashboard với stats
✅ AI viết bài (Gemini)
✅ Review & Edit drafts
✅ Scheduling posts
✅ Auto-publish (Inngest cron)
✅ Analytics
✅ Brand Vault management
✅ Multi-brand support
✅ Rate limiting
```

### 1.3 Các tính năng cần cải tiến/thêm

```
❌ Chrome Extension (MV3)
❌ Multi-platform: Threads, Instagram, Facebook Groups
❌ Auto-like anti-ban
❌ Popup UI theo dõi trạng thái
❌ Credits/Pricing system
❌ Backup server-side cho auto-posting
```

---

## Phần 2: Các Đề Xuất Cải Tiến

### Đề xuất 1: Thêm Chrome Extension (Ưu tiên cao)

**Tại sao:**
- User đã đăng nhập sẵn trên browser
- Không cần OAuth flow cho personal accounts
- Backup cho server-side API posting
- Auto-like anti-ban dễ dàng hơn

**Cấu trúc mới:**
```
AI_maketing_da_kenh_web/
├── frontend/                    # Next.js app (giữ nguyên)
├── extension/                   # Chrome Extension (MỚI)
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html/css/js
│   ├── content/
│   ├── automators/
│   └── lib/
└── ...
```

**Chức năng Extension:**
- Poll API để lấy bài chờ đăng
- Auto post lên Facebook Personal, Groups, X, Threads, IG
- Popup UI hiển thị trạng thái, countdown
- Auto-like sau khi đăng
- Credits balance display

### Đề xuất 2: Mở rộng Multi-Platform

**Hiện tại:** X, Facebook Page
**Thêm:**
- Facebook Groups (nhiều người dùng VN cần)
- Instagram (via Graph API hoặc browser automation)
- Threads (mới, ít người dùng VN nhưng xu hướng tăng)

### Đề xuất 3: Credits/Pricing System

**Cần thiết cho:**
- Freemium model
- Per-post pricing
- Monetization
- Quota management

**Thêm bảng:**
```sql
-- credit_packages
CREATE TABLE credit_packages (
  id UUID PRIMARY KEY,
  name VARCHAR,
  credits INT,
  price INT,
  is_active BOOLEAN DEFAULT true
);

-- credit_transactions
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  amount INT,
  type VARCHAR, -- purchase, spent, refund
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Đề xuất 4: Auto-Like Anti-Ban

**Kỹ thuật từ Auto MUT:**
```javascript
// Sau khi đăng xong, like 1-5 bài random
const targetCount = Math.floor(Math.random() * 5) + 1;
for (let i = 0; i < targetCount; i++) {
  await likeRandomPost();
  await sleep(3000 + Math.random() * 4000);
}
```

**Triển khai:**
- Extension: Auto-like sau khi post (dễ hơn)
- Server: Thêm endpoint để trigger auto-like nếu có quyền

---

## Phần 3: Kế Hoạch Chi Tiết Theo Phase

### Phase 1: Chrome Extension MVP (3-4 tuần)

#### 1.1 Cấu trúc Extension
```
extension/
├── manifest.json              # MV3
├── background.js             # Service Worker
├── popup.html                # Popup UI
├── popup.css
├── popup.js
├── content/
│   └── inject.js
├── automators/
│   ├── facebook.js           # FB Profile + Groups
│   ├── x.js                  # X.com
│   ├── threads.js            # Threads
│   └── instagram.js          # Instagram
└── lib/
    ├── logger.js
    ├── utils.js
    └── anti-detect.js
```

#### 1.2 manifest.json
```json
{
  "manifest_version": 3,
  "name": "Amplify Auto Poster",
  "version": "1.0.0",
  "permissions": ["storage", "alarms", "tabs", "scripting"],
  "host_permissions": [
    "https://*.facebook.com/*",
    "https://*.instagram.com/*",
    "https://x.com/*",
    "https://*.x.com/*",
    "https://*.threads.net/*",
    "https://*.threads.com/*",
    "https://api.amplify.local/*"
  ]
}
```

#### 1.3 Backend API cho Extension
```typescript
// Thêm endpoints mới
GET  /api/extension/tasks        // Extension poll bài chờ
POST /api/extension/tasks/complete // Cập nhật trạng thái
GET  /api/extension/stats        // Stats cho popup
GET  /api/extension/credits      // Credits balance
```

#### 1.4 Automators

**Facebook Personal:**
```
1. Mở facebook.com
2. Tìm "Ảnh/video" button
3. Click → Upload ảnh
4. Tìm Lexical editor
5. Paste nội dung
6. Click Đăng
7. Auto-like 1-5 bài
```

**Facebook Group:**
```
1. Mở group URL
2. Tìm "Bạn viết gì đi" textarea
3. Paste nội dung
4. Upload ảnh
5. Click Đăng
6. Auto-like
```

**X.com:**
```
1. Mở x.com
2. Tìm editor (React)
3. Paste nội dung
4. Upload ảnh (max 4)
5. Click Post
6. Auto-like
```

**Threads:**
```
1. Mở threads.net
2. Click "Start a thread"
3. Paste nội dung
4. Upload ảnh (max 4)
5. Click Publish
```

**Instagram:**
```
1. Mở instagram.com
2. Click Create (+)
3. Upload ảnh
4. Crop → Next → Next
5. Paste caption
6. Click Share
```

#### 1.5 Popup UI
```
┌─────────────────────────────┐
│ Amplify Auto Poster       │
├─────────────────────────────┤
│ ● Kết nối: user@email    │
├─────────────────────────────┤
│ Trạng thái: Chờ bài       │
│ Bài tiếp theo: 14:30     │
│ Countdown: 5p 30s         │
├─────────────────────────────┤
│ [⏸ Tạm dừng] [🔄 Quét] │
├─────────────────────────────┤
│ Hôm nay: ✅ 12 bài       │
│ Credits: 205 điểm        │
└─────────────────────────────┘
```

### Phase 2: Multi-Platform Extension (2-3 tuần)

#### 2.1 Instagram Automator
- Test trên instagram.com
- Handle Instagram's new UI (Create → Upload → Crop → Next...)
- Caption paste với hashtag

#### 2.2 Threads Automator
- Test trên threads.net
- Thread composition
- Multi-image support

#### 2.3 Facebook Groups Scanner
```typescript
// Thêm tính năng quét groups
interface GroupScanner {
  scanGroup(groupId: string): Promise<GroupInfo>;
  getGroupMembers(groupId: string): Promise<Member[]>;
  getGroupPosts(groupId: string): Promise<Post[]>;
}
```

### Phase 3: Credits System (2-3 tuần)

#### 3.1 Database Changes
```sql
-- Thêm vào supabase-schema.sql
CREATE TABLE credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  credits INT NOT NULL,
  price INT NOT NULL, -- VND
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount INT NOT NULL,
  type VARCHAR NOT NULL, -- purchase, spent, refund
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Thêm credits vào profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits INT DEFAULT 50;
```

#### 3.2 API Endpoints
```typescript
// credits
GET  /api/credits/balance
POST /api/credits/packages
POST /api/credits/purchase
GET  /api/credits/history

// packages mặc định
const DEFAULT_PACKAGES = [
  { name: 'Starter', credits: 50, price: 99000 },
  { name: 'Pro', credits: 200, price: 299000 },
  { name: 'Business', credits: 500, price: 599000 }
];
```

#### 3.3 Frontend Components
- Credits display trên header
- Purchase page
- Credits history

### Phase 4: Auto-Like System (1-2 tuần)

#### 4.1 Extension Auto-Like
```javascript
async function autoLikeAfterPost(platform) {
  const count = Math.floor(Math.random() * 5) + 1;
  const delay = () => 3000 + Math.random() * 4000;

  for (let i = 0; i < count; i++) {
    await findAndClickLikeButton();
    await sleep(delay());
  }
}
```

#### 4.2 Server-Side Auto-Like (Optional)
- Chỉ áp dụng nếu user có quyền
- X: Cần OAuth với like scope
- FB: Cần page access token với publish_actions

### Phase 5: Polish (2 tuần)

- Error handling & retry logic
- Logging system
- Stats dashboard improvement
- Documentation
- Testing

---

## Phần 4: Kỹ Thuật Quan Trọng (Từ Auto MUT)

### 4.1 CORS-Free Image Download
```javascript
// Background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchImage') {
    fetch(message.url)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ dataUrl: reader.result });
        reader.readAsDataURL(blob);
      });
    return true; // Async response
  }
});
```

### 4.2 File Upload Bypass
```javascript
function uploadFiles(fileInput, files) {
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype, 'files'
  ).set;
  setter.call(fileInput, dt.files);
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
}
```

### 4.3 Lexical Editor Paste
```javascript
function pasteToLexical(editor, text) {
  editor.focus();
  const textDt = new DataTransfer();
  textDt.setData('text/plain', text);
  editor.dispatchEvent(new ClipboardEvent('paste', {
    clipboardData: textDt, bubbles: true, cancelable: true
  }));
}
```

### 4.4 React Button Click
```javascript
function triggerReactClick(el) {
  let node = el;
  for (let i = 0; i < 5; i++) {
    const key = Object.keys(node).find(k => k.startsWith('__reactProps'));
    if (key && typeof node[key].onClick === 'function') {
      node[key].onClick({...});
      return true;
    }
    node = node.parentElement;
  }
  return false;
}
```

### 4.5 Anti-Detection
```javascript
// Random human-like delay
const humanDelay = () => 3000 + Math.random() * 7000;

// Auto-like sau khi đăng
async function antiDetect() {
  await sleep(humanDelay());
  const count = Math.floor(Math.random() * 5) + 1;
  for (let i = 0; i < count; i++) {
    await clickLikeButton();
    await sleep(3000 + Math.random() * 4000);
  }
}
```

---

## Phần 5: Thứ Tự Ưu Tiên Triển Khai

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Extension Foundation | Cao | Cao |
| 2 | Facebook Automator | Trung | Cao |
| 3 | X/Threads Automator | Trung | Trung |
| 4 | Credits System | Trung | Cao |
| 5 | Instagram Automator | Cao | Trung |
| 6 | Auto-Like | Thấp | Trung |
| 7 | Polish | Thấp | Thấp |

---

## Phần 6: Bắt Đầu Từ Đâu

### Option 1: Bắt đầu với Extension (Khuyến nghị)

1. Tạo folder `extension/` trong project
2. Setup manifest.json (MV3)
3. Tạo background.js với polling
4. Tạo popup UI cơ bản
5. Implement Facebook Personal automator
6. Test với local API

### Option 2: Bắt đầu với Credits System

1. Thêm tables vào Supabase
2. Tạo API endpoints
3. Thêm UI components
4. Integration với posting flow

### Option 3: Bắt đầu với Multi-Platform

1. Thêm Facebook Groups support
2. Thêm Threads support
3. Update AI prompts cho từng platform

---

## Tóm Tắt

### Điểm mạnh giữ lại:
- ✅ Next.js 15 + Supabase + Inngest
- ✅ AI content generation (Gemini)
- ✅ X + Facebook Page posting
- ✅ Brand Vault
- ✅ Rate limiting

### Cần cải tiến:
- ⬜ Chrome Extension cho browser-based posting
- ⬜ Multi-platform: Groups, Threads, IG
- ⬜ Credits/Pricing system
- ⬜ Auto-like anti-ban

### Thời gian ước tính:
- Phase 1 (Extension MVP): 3-4 tuần
- Phase 2 (Multi-Platform): 2-3 tuần
- Phase 3 (Credits): 2-3 tuần
- Phase 4 (Auto-Like): 1-2 tuần
- Phase 5 (Polish): 2 tuần

**Tổng: ~10-14 tuần** (có thể rút ngắn tùy mục tiêu)
