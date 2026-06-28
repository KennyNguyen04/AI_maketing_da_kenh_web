# Manual Testing Checklist - Amplify MVP

## 1. Authentication

- [ ] Đăng ký với email mới → Redirect đến onboarding
- [ ] Đăng nhập thành công → Redirect đến dashboard
- [ ] Đăng nhập sai mật khẩu → Hiện error message
- [ ] Đăng nhập email không tồn tại → Hiện error message
- [ ] Đăng xuất → Redirect đến landing page
- [ ] Truy cập /dashboard khi chưa login → Redirect /login
- [ ] Session timeout → Redirect /login

## 2. Brand Vault

### 2.1 Onboarding Wizard
- [ ] Tạo vault từ URL → Phân tích thành công
- [ ] Tạo vault từ text → Phân tích thành công
- [ ] Tạo vault từ form → Vault được tạo
- [ ] Skip sample sentences → Vault vẫn được tạo với defaults
- [ ] Edit system prompt trong confirm step → Lưu thành công
- [ ] Progress indicator hiển thị đúng (Step 1/2, Step 2/2)

### 2.2 Vault Management
- [ ] Xem danh sách vaults
- [ ] Switch giữa các vaults → Active vault thay đổi
- [ ] Edit vault name → Lưu thành công
- [ ] Delete vault → Vault biến mất
- [ ] Set vault làm active mặc định

## 3. Content Generation

### 3.1 Create Job
- [ ] Tạo job từ URL → Drafts được tạo
- [ ] Tạo job từ text → Drafts được tạo
- [ ] Tạo job cho LinkedIn → Draft LinkedIn được tạo
- [ ] Tạo job cho X/Twitter → Draft X được tạo
- [ ] Tạo job cho Facebook → Draft Facebook được tạo
- [ ] Chọn vault khác khi tạo job → Job dùng vault đã chọn
- [ ] Validation: không nhập nội dung → Hiện error

### 3.2 Review Drafts
- [ ] Xem danh sách drafts
- [ ] Edit draft content → Lưu thành công
- [ ] Regenerate single draft → Draft được tạo lại
- [ ] Copy content to clipboard
- [ ] Delete draft

## 4. Social Publishing

### 4.1 Connect Accounts
- [ ] Kết nối X account → OAuth flow hoạt động
- [ ] Kết nối Facebook page → OAuth flow hoạt động
- [ ] Disconnect account → Account bị xóa

### 4.2 Publish
- [ ] Publish draft lên X → Bài đăng xuất hiện trên X
- [ ] Publish draft lên Facebook → Bài đăng xuất hiện trên Facebook
- [ ] Retry failed publish → Thử đăng lại thành công
- [ ] View publish history → Lịch sử hiển thị đúng

### 4.3 Anti-Shadowban
- [ ] Đăng nhiều bài liên tiếp → Có delays giữa các bài
- [ ] Rate limit exceeded → Hiện thông báo

## 5. Scheduling

- [ ] Xem calendar với scheduled posts
- [ ] Schedule draft → Draft được lên lịch
- [ ] Edit scheduled time → Giờ thay đổi
- [ ] Cancel scheduled post → Bài bị xóa khỏi lịch
- [ ] Navigate weeks in calendar

## 6. Analytics

- [ ] Xem dashboard overview
- [ ] Xem content performance
- [ ] Filter by date range
- [ ] Stats hiển thị đúng số liệu

## 7. Admin Panel

- [ ] Admin access /admin
- [ ] Non-admin redirect khi truy cập /admin
- [ ] View total users, jobs, success rate
- [ ] View users list
- [ ] View user details
- [ ] Disable/enable user account
- [ ] View jobs list
- [ ] Filter jobs by status
- [ ] View failed jobs
- [ ] Retry single failed job
- [ ] Retry all failed jobs
- [ ] View recent activity
- [ ] Export feedback as CSV

## 8. Multi-Brand Vault

- [ ] Tạo nhiều vaults cho cùng user
- [ ] Switch vault trong header
- [ ] Tạo vault mới nhanh từ switcher
- [ ] Vault đang active được highlight
- [ ] Job dùng đúng vault khi tạo

## 9. UX Polish

### 9.1 Loading States
- [ ] Skeleton loader khi fetch data
- [ ] Loading spinner khi submit form
- [ ] Disabled button khi đang xử lý

### 9.2 Empty States
- [ ] Empty dashboard state với CTA
- [ ] Empty drafts state
- [ ] Empty history state

### 9.3 Toast Notifications
- [ ] Success toast khi đăng thành công
- [ ] Error toast khi có lỗi
- [ ] Toast tự động dismiss sau 4s
- [ ] Multiple toasts stack correctly

## 10. Error Handling

- [ ] Invalid URL → Hiện error message rõ ràng
- [ ] API failure → Graceful degradation
- [ ] Network offline → Thông báo user
- [ ] Form validation → Hiện inline errors
- [ ] 404 page styled correctly

## 11. Mobile Responsiveness

- [ ] Landing page responsive
- [ ] Dashboard responsive
- [ ] Forms usable on mobile
- [ ] Navigation works on mobile
- [ ] Tables scroll horizontally

## 12. Cross-Browser Testing

- [ ] Chrome (latest) - Tất cả flows
- [ ] Firefox (latest) - Tất cả flows
- [ ] Safari (Mac) - Các flows chính

## Bug Severity Guide

### Critical (Fix immediately)
- Crash hoặc white screen
- Data loss
- Security vulnerability
- Payment issues

### Major (Fix before launch)
- Broken flows
- Missing functionality
- Poor UX
- Performance issues

### Minor (Fix if time)
- Cosmetic issues
- Typos
- Minor styling
- Edge cases
