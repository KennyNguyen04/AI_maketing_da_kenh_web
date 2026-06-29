# Manual Testing Results — Amplify MVP v0.1.0

**Tester:** ___________________
**Date started:** ___________________
**Environment:**
- Branch: `main` (d937e5e)
- Tag: `v0.1.0`
- Local Supabase: yes / no
- Internet (for OAuth): yes / no

**Trạng thái icon:**
- ☐ Untested
- ✅ Pass
- ❌ Fail (ghi bug bên dưới)
- ⚠️ Skipped (with reason)

---

## Auto-verified (đã pass trước khi vào manual session)

- ✅ npm run typecheck — PASS
- ✅ 345/345 vitest tests pass
- ✅ npm run build — OK (~11s)
- ✅ `app/(app)/not-found.tsx` exists (Section 10.5)
- ✅ `app/(app)/error.tsx` exists (Section 10.5)
- ✅ `app/(app)/loading.tsx` exists (Section 9.1)
- ✅ Toast 4000ms auto-dismiss + AnimatePresence stacking (Section 9.3)

---

## Bảng kết quả manual test

### 1. Authentication (7 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 1.1 | Đăng ký email mới → onboarding | ☐ | |
| 1.2 | Đăng nhập → dashboard | ☐ | |
| 1.3 | Sai password → error | ☐ | |
| 1.4 | Email không tồn tại → error | ☐ | |
| 1.5 | Đăng xuất → landing | ☐ | |
| 1.6 | /dashboard khi chưa login → /login | ☐ | |
| 1.7 | Session timeout → /login | ☐ | |

### 2. Brand Vault (11 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 2.1 | Tạo vault từ URL | ☐ | |
| 2.2 | Tạo vault từ text | ☐ | |
| 2.3 | Tạo vault từ form | ☐ | |
| 2.4 | Skip sample sentences → defaults | ☐ | |
| 2.5 | Edit system prompt → lưu | ☐ | |
| 2.6 | Progress indicator (Step 1/2, 2/2) | ☐ | |
| 2.7 | Xem danh sách vaults | ☐ | |
| 2.8 | Switch giữa vaults → active thay đổi | ☐ | |
| 2.9 | Edit vault name → lưu | ☐ | |
| 2.10 | Delete vault → biến mất | ☐ | |
| 2.11 | Set vault active mặc định | ☐ | |

### 3. Content Generation (9 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 3.1 | Tạo job từ URL | ☐ | |
| 3.2 | Tạo job từ text | ☐ | |
| 3.3 | Job LinkedIn | ☐ | |
| 3.4 | Job X/Twitter | ☐ | |
| 3.5 | Job Facebook | ☐ | |
| 3.6 | Chọn vault khác khi tạo job | ☐ | |
| 3.7 | Validation: trống nội dung | ☐ | |
| 3.8 | Edit draft content | ☐ | |
| 3.9 | Regenerate single draft | ☐ | |
| 3.10 | Copy to clipboard | ☐ | |
| 3.11 | Delete draft | ☐ | |

### 4. Social Publishing (8 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 4.1 | Kết nối X OAuth | ☐ | |
| 4.2 | Kết nối Facebook OAuth | ☐ | |
| 4.3 | Disconnect account | ☐ | |
| 4.4 | Publish lên X | ☐ | |
| 4.5 | Publish lên Facebook | ☐ | |
| 4.6 | Retry failed publish | ☐ | |
| 4.7 | View publish history | ☐ | |
| 4.8 | Rate limit / delays | ☐ | |

### 5. Scheduling (5 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 5.1 | Xem calendar với scheduled posts | ☐ | |
| 5.2 | Schedule draft | ☐ | |
| 5.3 | Edit scheduled time | ☐ | |
| 5.4 | Cancel scheduled post | ☐ | |
| 5.5 | Navigate weeks | ☐ | |

### 6. Analytics (4 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 6.1 | Dashboard overview | ☐ | |
| 6.2 | Content performance | ☐ | |
| 6.3 | Filter by date range | ☐ | |
| 6.4 | Stats hiển thị đúng | ☐ | |

### 7. Admin Panel (13 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 7.1 | Admin access /admin | ☐ | |
| 7.2 | Non-admin redirect | ☐ | |
| 7.3 | Total users, jobs, success rate | ☐ | |
| 7.4 | Users list | ☐ | |
| 7.5 | User details | ☐ | |
| 7.6 | Disable/enable user | ☐ | |
| 7.7 | Jobs list | ☐ | |
| 7.8 | Filter jobs by status | ☐ | |
| 7.9 | Failed jobs | ☐ | |
| 7.10 | Retry single failed | ☐ | |
| 7.11 | Retry all failed | ☐ | |
| 7.12 | Recent activity | ☐ | |
| 7.13 | Export feedback as CSV | ☐ | |

### 8. Multi-Brand Vault (5 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 8.1 | Tạo nhiều vaults cho 1 user | ☐ | |
| 8.2 | Switch vault trong header | ☐ | |
| 8.3 | Tạo vault mới từ switcher | ☐ | |
| 8.4 | Vault active highlighted | ☐ | |
| 8.5 | Job dùng đúng vault | ☐ | |

### 9. UX Polish (8 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 9.1 | Skeleton loader khi fetch | ☐ | |
| 9.2 | Loading spinner khi submit | ☐ | |
| 9.3 | Disabled button khi xử lý | ☐ | |
| 9.4 | Empty dashboard state + CTA | ☐ | |
| 9.5 | Empty drafts state | ☐ | |
| 9.6 | Empty history state | ☐ | |
| 9.7 | Success toast | ☐ | |
| 9.8 | Error toast | ☐ | |
| 9.9 | Multiple toasts stack | ☐ | |
| 9.10 | Toast auto-dismiss 4s | ☐ | |

### 10. Error Handling (5 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 10.1 | Invalid URL → error | ☐ | |
| 10.2 | API failure → graceful | ☐ | |
| 10.3 | Network offline → thông báo | ☐ | |
| 10.4 | Form validation inline | ☐ | |
| 10.5 | 404 page styled correctly | ☐ | |

### 11. Mobile Responsiveness (5 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 11.1 | Landing page responsive | ☐ | |
| 11.2 | Dashboard responsive | ☐ | |
| 11.3 | Forms usable on mobile | ☐ | |
| 11.4 | Navigation mobile | ☐ | |
| 11.5 | Tables scroll horizontally | ☐ | |

### 12. Cross-Browser (3 items)

| # | Item | Status | Bug |
|---|---|---|---|
| 12.1 | Chrome (latest) — all flows | ☐ | |
| 12.2 | Firefox (latest) — all flows | ☐ | |
| 12.3 | Safari (Mac) — main flows | ☐ | |

---

## Bugs Found

| # | Section | Severity | Description | Repro Steps |
|---|---|---|---|---|
| | | | | |
| | | | | |

Severity: **Critical** (block launch) / **Major** (fix before launch) / **Minor** (post-launch OK)

---

## Decision After Testing

- [ ] **All pass → ready for v0.1.1 hot-fixes (if any) → production launch**
- [ ] **Critical bugs → fix immediately, retest, patch release v0.1.1**
- [ ] **Major bugs → schedule Sprint 6 fix, postpone launch**
- [ ] **Minor only → launch OK, file as known limitations**

## Total Stats

| Section | Tested | Pass | Fail | Skip |
|---|---|---|---|---|
| 1. Auth | _/7 | _ | _ | _ |
| 2. Brand Vault | _/11 | _ | _ | _ |
| 3. Content Generation | _/11 | _ | _ | _ |
| 4. Social Publishing | _/8 | _ | _ | _ |
| 5. Scheduling | _/5 | _ | _ | _ |
| 6. Analytics | _/4 | _ | _ | _ |
| 7. Admin | _/13 | _ | _ | _ |
| 8. Multi-Brand | _/5 | _ | _ | _ |
| 9. UX Polish | _/10 | _ | _ | _ |
| 10. Error Handling | _/5 | _ | _ | _ |
| 11. Mobile | _/5 | _ | _ | _ |
| 12. Cross-Browser | _/3 | _ | _ | _ |
| **TOTAL** | _/87 | _ | _ | _ |

(89 items - 2 auto-verified = 87 manual items)
