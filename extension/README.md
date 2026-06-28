# Amplify Auto Poster - Chrome Extension

Extension để auto post content lên multiple social platforms (Facebook, X, Threads, Instagram, LinkedIn).

## Cấu trúc thư mục

```
extension/
├── manifest.json       # MV3 manifest
├── background.js       # Service Worker (MV3)
├── popup.html/css/js   # Popup UI
├── content/
│   └── inject.js       # Content script (auto-poster)
├── lib/
│   ├── utils.js        # Utility functions
│   ├── logger.js       # Logging utility
│   └── anti-detect.js  # Anti-detection helpers
└── icons/              # Extension icons
```

## Setup

### 1. Cài đặt Extension

1. Mở Chrome, vào `chrome://extensions/`
2. Bật **Developer mode** (góc phải trên)
3. Click **Load unpacked**
4. Chọn thư mục `extension/`

### 2. Chạy Migration Database

Chạy file migration trong Supabase SQL Editor:

```sql
-- Chạy trong Supabase SQL Editor
-- File: migrations/002_extension_tasks.sql
```

### 3. Kết nối API

1. Mở extension popup
2. Nhập API URL (e.g., `http://localhost:3000` khi dev)
3. Nhập API Key (lấy từ settings page của app)
4. Click "Lưu & Kết nối"

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/api/extension/status` | Verify credentials |
| GET | `/api/extension/tasks` | Get pending tasks |
| POST | `/api/extension/tasks` | Create task |
| GET | `/api/extension/tasks/[id]` | Get task detail |
| PATCH | `/api/extension/tasks/[id]` | Update task status |
| DELETE | `/api/extension/tasks/[id]` | Cancel task |

## Cách hoạt động

1. **Background Service Worker** chạy polling mỗi 1 phút
2. Khi có task pending, nó mở tab social platform tương ứng
3. **Content Script** nhận task và tự động điền content vào composer
4. Click "Đăng" và đợi xác nhận thành công
5. Thực hiện anti-detect like (1-5 bài) để tránh bị phát hiện
6. Gửi signal completion về background

## Supported Platforms

- Facebook (Profile, Pages)
- Facebook Groups
- X / Twitter
- Threads
- Instagram
- LinkedIn

## Anti-Detection

- Random delay giữa các actions
- Auto-like sau khi post (1-5 bài)
- Random mouse movement
- Human-like typing speed
- Platform-specific selectors để tránh detection

## Troubleshooting

### Extension không load
- Kiểm tra `manifest.json` có syntax đúng không
-确保所有 required fields có mặt

### Popup không hiện
- Kiểm tra `popup.html` có đúng đường dẫn trong manifest không
- Mở DevTools ở popup bằng cách right-click → Inspect

### Content script không chạy
- Kiểm tra `host_permissions` trong manifest
- Đảm bảo URL pattern đúng với trang đang mở

### Auto-post không hoạt động
- Platform có thể đã thay đổi DOM selectors
- Kiểm tra console log trong DevTools của trang social

## Development

```bash
# Watch mode - auto-reload khi thay đổi
# Reload extension trong chrome://extensions/

# Test content script
# Mở DevTools trên trang social, gõ:
AmplifyAutoPoster.test()
```
