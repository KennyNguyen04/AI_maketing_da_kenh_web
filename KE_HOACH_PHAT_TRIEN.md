# Amplify AI Marketing - Kế Hoạch Phát Triển

**Mục tiêu:** Xây dựng hệ thống Auto Post AI Marketing multi-platform với Extension Chrome + Puppeteer + AI Writer

**Tham khảo:** Auto Post MUT (extension MV3) + Amplify MVP (Puppeteer sẵn có)

---

## Tổng Quan Kiến Trúc

```
┌──────────────────────────────────────────────────────────────────┐
│                    AMPLIFY AI MARKETING                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌────────────────┐  │
│  │   Web App     │────▶│   Backend     │◀────│   Extension    │  │
│  │  (React)      │     │  (Node.js)    │     │  (Chrome MV3)  │  │
│  └──────────────┘     └──────────────┘     └────────────────┘  │
│         │                    │                      │            │
│  • Dashboard           • Auth & DB            • Auto Poster   │
│  • AI Writer           • Posts API             • Popup UI      │
│  • Stats               • Scheduling            • Multi-platform│
│  • Media Manager       • Credits              • Anti-detect  │
│                                                                   │
│                    ┌─────────────────┐                            │
│                    │  Puppeteer Hub  │  (Server-side backup)     │
│                    └─────────────────┘                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. Backend Foundation

### 1.1 Database Schema

**users**
| Column | Type | Mô tả |
|--------|------|--------|
| id | UUID | Primary key |
| email | VARCHAR | Email |
| password_hash | VARCHAR | Bcrypt hash |
| credits | INT | Số dư điểm (mặc định: 50) |
| quota | INT | Giới hạn tháng |
| quota_used | INT | Đã dùng |
| created_at | TIMESTAMP | |

**posts**
| Column | Type | Mô tả |
|--------|------|--------|
| id | UUID | Primary key |
| user_id | UUID | FK |
| title | VARCHAR | Tiêu đề |
| content | TEXT | Nội dung |
| images | JSON | Array URLs ảnh |
| videos | JSON | Array URLs video |
| platform | ENUM | facebook, fb_group, threads, instagram, x |
| target_url | VARCHAR | Group URL |
| status | ENUM | pending, approved, posted, failed |
| scheduled_at | TIMESTAMP | Thời gian đăng |
| posted_at | TIMESTAMP | Thực tế đăng |
| result_url | VARCHAR | URL bài đã đăng |
| retry_count | INT | Số lần retry |
| error_message | TEXT | Lỗi nếu có |
| created_at | TIMESTAMP | |

**platform_accounts**
| Column | Type | Mô tả |
|--------|------|--------|
| id | UUID | |
| user_id | UUID | |
| platform | ENUM | facebook, threads, ig, x |
| access_token | TEXT | Token |
| cookies | TEXT | Cookies |
| status | ENUM | active, inactive |

**credit_transactions**
| Column | Type | Mô tả |
|--------|------|--------|
| id | UUID | |
| user_id | UUID | |
| amount | INT | |
| type | ENUM | purchase, spent, refund |
| description | TEXT | |

### 1.2 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| POST | /api/auth/register | Đăng ký |
| POST | /api/auth/login | Đăng nhập, trả JWT |
| GET | /api/auth/session | Check session |
| GET | /api/posts | List user's posts |
| POST | /api/posts | Create post |
| PUT | /api/posts/:id | Update post |
| DELETE | /api/posts/:id | Delete post |
| GET | /api/tasks | Extension poll bài chờ |
| POST | /api/tasks/completed | Extension cập nhật trạng thái |
| GET | /api/tasks/stats | Stats: pending, completed, credits |
| POST | /api/ai/generate | AI viết bài |
| POST | /api/ai/rewrite | AI viết lại |
| GET | /api/platform-accounts | List accounts |
| POST | /api/platform-accounts | Add account |
| DELETE | /api/platform-accounts/:id | Remove |
| GET | /api/credits/balance | Số dư credits |
| POST | /api/credits/purchase | Mua credits |

### 1.3 Credits System

```javascript
const creditsConfig = {
  facebook: { cost: 1, limit: 10 },
  facebook_group: { cost: 2, limit: 20 },
  instagram: { cost: 2, limit: 10 },
  x: { cost: 1, limit: 10 },
  threads: { cost: 1, limit: 10 }
};
```

---

## 2. Web App (Frontend)

### 2.1 Dashboard

```
├── Overview Stats
│   ├── Posts this month
│   ├── Success rate
│   ├── Credits balance
│   └── Next scheduled post
│
├── Posts Manager
│   ├── Create Post (AI Writer)
│   ├── Edit/Delete
│   ├── Schedule
│   ├── Filter & Search
│   └── Bulk import
│
├── AI Writer ⭐ (Điểm khác biệt)
│   ├── Platform selector
│   ├── Topic/Product input
│   ├── Tone & Length
│   ├── Generate → Preview → Edit → Save
│   └── Hashtag suggestions
│
├── Platform Accounts
│   ├── Connect accounts
│   └── Manage sessions
│
├── Scheduling Calendar
│
├── Analytics
│
└── Settings
    ├── Credits & Billing
    └── API Keys
```

### 2.2 AI Writer - Prompt Templates

```javascript
const promptTemplates = {
  facebook: `
Viết bài quảng cáo Facebook cho sản phẩm: {product}
Yêu cầu:
- Độ dài: {length} từ
- Tone: {tone}
- Có emoji phù hợp
- Có CTA rõ ràng
- Có hashtag phù hợp
- Tối ưu cho thuật toán Facebook
`,

  x: `
Write a tweet about: {product}
- Max 280 characters
- Engaging hook
- Include relevant hashtags
- Call to action
`,

  instagram: `
Write an Instagram caption for: {product}
- Include relevant emojis
- Add hashtags (separate line)
- Engaging story-style
- Include CTA
`,

  threads: `
Write a Threads post about: {product}
- Conversational tone
- Discussion starter
- Max 500 characters
`
};
```

---

## 3. Chrome Extension (MV3)

### 3.1 Cấu Trúc Files

```
extension/
├── manifest.json              # Config MV3
├── background.js              # Service Worker (CRITICAL)
├── popup.html                # UI popup
├── popup.css
├── popup.js                  # Popup logic
├── content/
│   └── inject.js             # Communication với web
├── automators/
│   ├── facebook.js           # FB Profile + Groups
│   ├── x.js                  # X.com
│   ├── instagram.js          # Instagram
│   └── threads.js            # Threads
├── lib/
│   ├── logger.js             # Overlay UI
│   ├── utils.js              # Common functions
│   └── anti-detect.js        # Random delays, auto-like
└── icons/
    └── icon-*.png
```

### 3.2 manifest.json

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
    "https://*.yourdomain.com/*"
  ],
  "content_scripts": [{
    "js": ["content/inject.js"],
    "matches": ["https://*.yourdomain.com/*"],
    "run_at": "document_start"
  }]
}
```

### 3.3 Background.js - Core Logic

```javascript
// Polling mỗi 1 phút
chrome.alarms.create("pollPendingPosts", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pollPendingPosts") {
    checkAllTasks();
  }
});

// Tab tracker
let processingTabId = null;

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId !== processingTabId) return;
  if (changeInfo.status !== 'complete') return;
  
  const scriptFile = getAutomatorScript(post.platform);
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [scriptFile]
  });
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'postCompleted') {
    updatePostStatus(message.postId, 'success', message.resultUrl);
    chrome.tabs.remove(processingTabId).catch(() => {});
    processingTabId = null;
    checkAllTasks();
  }
  else if (message.action === 'postFailed') {
    updatePostStatus(message.postId, 'failed', null);
    checkAllTasks();
  }
  else if (message.action === 'fetchImage') {
    // CORS-free image download
    fetch(message.url)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ success: true, dataUrl: reader.result });
        reader.readAsDataURL(blob);
      });
    return true; // Async
  }
});
```

### 3.4 Popup UI

```
┌─────────────────────────────┐
│ Amplify Auto Poster v1.0  │
├─────────────────────────────┤
│ ● Đã kết nối              │
│ 👤 user@email.com          │
├─────────────────────────────┤
│       ⏳ Đang chờ bài       │
│  Chờ bài lúc 14:30        │
│  Sẽ chạy trong 5p 30s     │
│                             │
│  [⏸ Tạm dừng] [🚀 Quét]  │
├─────────────────────────────┤
│ Tiến độ đăng bài           │
│ [⏳ Chờ] [✅ Hôm nay] [Tổng]│
│ [  3  ] [   12  ] [  156 ] │
├─────────────────────────────┤
│ Credits: 205 điểm         │
└─────────────────────────────┘
```

### 3.5 Automator Scripts - Kỹ Thuật Quan Trọng

**Common Pattern (áp dụng tất cả platforms):**

```javascript
// 1. Prevention of double-injection
if (window.amplify_injected) exit();
window.amplify_injected = true;

// 2. Safe click (dispatch all events)
function doClick(el) {
  el.focus();
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  el.click();
}

// 3. Download ảnh CORS-free
function fetchImageViaBackground(url) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'fetchImage', url }, res => {
      resolve(res);
    });
  });
}

// 4. Upload file (bypass readonly)
function uploadFiles(fileInput, files) {
  const dt = new DataTransfer();
  files.forEach(f => dt.items.add(f));
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype, 'files'
  ).set;
  setter.call(fileInput, dt.files);
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
}

// 5. Paste vào Lexical (KHÔNG dùng innerText)
function pasteText(editor, text) {
  editor.focus();
  const textDt = new DataTransfer();
  textDt.setData('text/plain', text);
  editor.dispatchEvent(new ClipboardEvent('paste', {
    clipboardData: textDt, bubbles: true, cancelable: true
  }));
}

// 6. Retry logic
async function postWithRetry(post, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await autoPost(post);
      return true;
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(5000 * (i + 1));
    }
  }
}

// 7. Anti-detection
async function antiDetect() {
  // Auto-like 1-5 bài
  const count = Math.floor(Math.random() * 5) + 1;
  for (let i = 0; i < count; i++) {
    await likeRandomPost();
    await sleep(3000 + Math.random() * 4000);
  }
  // Random delay
  await sleep(3000 + Math.floor(Math.random() * 7000));
}
```

**Facebook Automator:**

```
Flow: Click "Ảnh/video" → Upload → Tìm Lexical → Paste → Click Đăng
```

**X.com Automator:**

```javascript
// React button click
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
// Limit: 4 ảnh
```

**Instagram Automator:**

```
Flow: Click Create (+) → Upload → Crop Original → Next...Next → Caption → Share
```

---

## 4. Puppeteer Integration (Server-side)

Giữ và mở rộng từ Amplify MVP hiện tại cho:

- Auto-comment campaigns
- Bulk operations
- Background processing khi browser đóng
- Testing automation

---

## 5. Anti-Detection

```javascript
// 1. Random human-like delays
const humanDelay = () => 3000 + Math.random() * 7000;

// 2. Auto-like sau khi đăng
async function autoLikeAfterPost() {
  const count = Math.floor(Math.random() * 5) + 1;
  for (let i = 0; i < count; i++) {
    await clickLikeButton();
    await sleep(3000 + Math.random() * 4000);
  }
}

// 3. Credits check notification
if (json.error?.code === 'OUT_OF_CREDITS') {
  chrome.notifications.create({
    title: 'Hết Credits',
    message: 'Vui lòng nạp thêm để tiếp tục'
  });
}
```

---

## 6. Lộ Trình Phát Triển

### Phase 1: Backend Foundation (2-3 tuần)
- [ ] Auth (JWT)
- [ ] Database setup
- [ ] Posts CRUD API
- [ ] Extension API endpoints
- [ ] Basic credits system

### Phase 2: Extension MVP (3-4 tuần)
- [ ] Extension setup (manifest, background, popup)
- [ ] Facebook Personal automator
- [ ] Facebook Group automator
- [ ] Credits integration
- [ ] Popup UI với stats

### Phase 3: Multi-Platform (2-3 tuần)
- [ ] X.com automator
- [ ] Instagram automator
- [ ] Threads automator
- [ ] Anti-detection improvements

### Phase 4: AI Marketing (3-4 tuần)
- [ ] AI API integration (Gemini)
- [ ] Prompt templates cho từng platform
- [ ] AI Writer UI
- [ ] Content preview & edit

### Phase 5: Polish & Scale (2-3 tuần)
- [ ] Error handling & retry logic
- [ ] Analytics dashboard
- [ ] Pricing/Packages
- [ ] Documentation

---

## 7. Tóm Tắt

### Điểm mạnh giữ lại:
- ✅ Puppeteer cho server-side automation (Amplify MVP)
- ✅ Multi-platform support
- ✅ Clean codebase structure

### Bổ sung mới:
- ⬜ Extension Chrome MV3 cho browser-based posting
- ⬜ **AI Marketing Writer** (điểm khác biệt chính)
- ⬜ Credits/Pricing system
- ⬜ Anti-detection measures
- ⬜ Better dashboard & stats

### Tham khảo từ Auto MUT:
- ✅ Extension architecture
- ✅ Popup UI với countdown
- ✅ Automator scripts (selectors, techniques)
- ✅ Credits integration
- ✅ Multi-platform approach

### Kết luận:
- **NÊN build Extension** vì user đã đăng nhập sẵn trên browser
- **Kết hợp Puppeteer** cho auto-comment và background processing
- **AI Marketing là key differentiator** - Auto MUT không có, đây là điểm bán hàng mạnh
