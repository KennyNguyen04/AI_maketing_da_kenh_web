# Kế hoạch Kiểm thử Chi tiết (Test Plan) - AI Marketing Đa Kênh

Tài liệu này vạch ra kế hoạch kiểm thử toàn diện, thực tế và chi tiết dành riêng cho dự án **AI Marketing Đa Kênh (Amplify)**, chuẩn bị cho giai đoạn **Alpha Testing (5-10 người dùng thực tế)** và chuyển giao sang giai đoạn Beta.

---

## 📌 1. Mục Tiêu Kiểm Thử (Test Objectives)

1. **Độ ổn định chức năng (Functional Reliability):** Đảm bảo tất cả các module chính (Auth, Brand Vault, Repurposing Engine, Review Dashboard) hoạt động chính xác theo Masterplan.
2. **Khả năng tích hợp (Integration Quality):** Xác minh luồng trao đổi dữ liệu mượt mà giữa các lớp: Next.js frontend ⟷ Supabase DB & Auth ⟷ Trình xếp hàng Inngest ⟷ Google Gemini AI.
3. **Khả năng chịu lỗi & Phục hồi (Error Handling & Resilience):** Đảm bảo hệ thống tự phục hồi khi gặp lỗi kết nối AI (qua cơ chế retry) và cung cấp thông báo Toast thân thiện, trực quan thay vì làm sập ứng dụng.
4. **Trải nghiệm người dùng (UX/UI Consistency):** Kiểm tra hiển thị giao diện mượt mà (Loading Skeletons), thao tác chỉnh sửa bài nháp tự động lưu và độ tương thích thiết kế desktop (1280px & 1440px).

---

## 🔍 2. Phạm Vi Kiểm Thử (Scope of Testing)

### 2.1 Các tính năng được kiểm thử (In-Scope):
* **Module 1 (Auth):** Đăng ký tài khoản mới, đăng nhập, bảo vệ route bằng Middleware, xử lý callback.
* **Module 2 (Brand Vault):** 
  * *Flow A:* Nhập bài viết/URL, kích hoạt Inngest chạy ngầm phân tích và tạo Voice Profile.
  * *Flow B (Cold Start):* Trả lời 5 câu hỏi nhanh, phân tích đồng bộ trực tiếp với Gemini để tạo Voice Profile.
  * *Trang xác nhận:* Tùy biến tag (thêm/xóa tag thủ công), cập nhật lại hệ thống prompt.
* **Module 3 (Repurposing Engine):** Tạo job mới, gọi Gemini phân tích và chuyển đổi nội dung song song (Parallel Generation) ra 4 kênh (LinkedIn Post, LinkedIn Thread, Facebook, Twitter), quản lý hàng đợi.
* **Module 4 (Review Dashboard):** Dashboard thống kê danh sách job, trang chỉnh sửa bài viết chi tiết, tính năng autosave (debounce 1s), tạo lại bài viết phiên bản mới (Regenerate), copy bài đăng.
* **Module 5 (UX/Resilience):** Skeleton loading, AI retry logic 1 lần khi lỗi mạng, hiển thị Toast cảnh báo.
* **Admin Alpha Panel:** Phân quyền admin, xem users, xem failed jobs, retry job, export feedback CSV.
* **Social Distribution:** Kết nối X/Facebook Page, publish có xác nhận, Facebook fallback Copy + Open.

### 2.2 Các tính năng nằm ngoài phạm vi (Out-of-Scope cho Alpha):
* Khả năng tương thích responsive hoàn toàn trên điện thoại di động (Alpha chỉ tập trung tối ưu hóa màn hình Desktop >= 1280px).
* Tự động đăng bài không cần phê duyệt. Giai đoạn này chỉ publish khi người dùng bấm xác nhận rõ ràng.
* LinkedIn publishing, scheduler, media upload và analytics import.
* Tích hợp thanh toán và giới hạn gói cước thành viên (Billing & Subscription).

---

## 🛠️ 3. Kịch Bản Kiểm Thử Chi Tiết (Detailed Test Cases)

### Kịch bản 1: Module 1 - Xác Thực & Phân Quyền (Auth)
| ID | Tên Kịch Bản | Các Bước Thực Hiện | Kết Quả Mong Đợi (Pass Criteria) | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Đăng ký tài khoản mới | 1. Vào `/register`<br>2. Nhập Email, mật khẩu và Họ tên<br>3. Nhấn "Đăng ký" | - Đăng ký thành công, chuyển hướng về `/onboarding`.<br>- Kiểm tra trong Supabase table `profiles` có dòng chứa ID và thông tin user tương ứng. | ✅ Pass |
| **TC-02** | Đăng nhập tài khoản | 1. Vào `/login`<br>2. Nhập email/mật khẩu vừa tạo<br>3. Nhấn "Đăng nhập" | - Đăng nhập thành công, chuyển hướng đến `/dashboard` (hoặc `/onboarding` nếu chưa có Vault). | ✅ Pass |
| **TC-03** | Bảo vệ tuyến đường (Middleware) | 1. Đăng xuất hoặc dùng tab ẩn danh<br>2. Truy cập trực tiếp vào `/dashboard` hoặc `/review/[jobId]` | - Bị Middleware chặn lại và tự động chuyển hướng về `/login`. | ✅ Pass |
| **TC-04** | Trải nghiệm quên mật khẩu | 1. Vào `/login`<br>2. Nhấn nút "Quên mật khẩu? / Forgot password?" | - Xuất hiện Toast thông báo màu xanh dương hướng dẫn liên hệ Admin để khôi phục mật khẩu. | ✅ Pass |

---

### Kịch bản 2: Module 2 - Thiết Lập Brand Vault
| ID | Tên Kịch Bản | Các Bước Thực Hiện | Kết Quả Mong Đợi (Pass Criteria) | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **TC-05** | Phân tích bài viết mẫu (Flow A - Text) | 1. Chọn luồng "Tôi có bài viết sẵn"<br>2. Dán đoạn văn bản mẫu dài > 100 từ<br>3. Nhấn "Tạo Brand Vault" | - Giao diện chuyển sang màn hình `AnalyzingLoader`.<br>- Inngest job được kích hoạt chạy ngầm, gọi Gemini phân tích thành công.<br>- Người dùng được chuyển sang màn hình `/onboarding/confirm`. | ✅ Pass |
| **TC-06** | Phân tích qua liên kết (Flow A - URL) | 1. Chọn luồng "Tôi có bài viết sẵn"<br>2. Nhập một URL bài viết thực tế hợp lệ<br>3. Nhấn "Tạo Brand Vault" | - Next.js cào được text từ URL (sử dụng jsdom & readability).<br>- Phân tích thành công bằng AI chạy ngầm và chuyển hướng về trang xác nhận giọng văn. | ✅ Pass |
| **TC-07** | Khởi tạo từ khảo sát (Flow B - Form) | 1. Chọn luồng "Tôi chưa có gì (Form)"<br>2. Nhập chủ đề, chọn Tone/Style và dán câu mẫu<br>3. Nhấn "Tạo Brand Vault" | - Gọi API `/api/brand-vault/from-form` chạy đồng bộ.<br>- Màn hình `AnalyzingLoader` xuất hiện khoảng 2-3 giây rồi chuyển hướng ngay tới trang xác nhận.<br>- Cực kỳ mượt mà. | ✅ Pass |
| **TC-08** | Chỉnh sửa tags và Lưu trữ | 1. Tại trang `/onboarding/confirm`, bấm xóa một tag Tone bất kỳ.<br>2. Bấm nút "+ Thêm / Add", nhập một tag mới.<br>3. Nhấn "Lưu Brand Vault" | - Tag được xóa và thêm mới ngay trên giao diện.<br>- Bấm Save hiển thị Toast thành công và chuyển hướng về `/dashboard`. Bảng `brand_vaults` trong DB cập nhật chính xác `voice_profile` đã sửa. | ✅ Pass |

---

### Kịch bản 3: Module 3 & 4 - Chuyển Đổi Nội Dung & Soạn Thảo (Repurposing Engine & Dashboard)
| ID | Tên Kịch Bản | Các Bước Thực Hiện | Kết Quả Mong Đợi (Pass Criteria) | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **TC-09** | Cảnh báo chưa có Brand Vault | 1. Đăng ký tài khoản mới chưa cấu hình Brand Vault.<br>2. Cố tình truy cập `/dashboard/new` | - Giao diện hiển thị cảnh báo đẹp mắt: "Bạn chưa có Brand Vault" kèm nút "Thiết lập ngay" dẫn về trang onboarding. Nút tạo Job bị vô hiệu hóa. | ✅ Pass |
| **TC-10** | Tạo Job chuyển đổi nội dung | 1. Có Brand Vault hợp lệ.<br>2. Vào `/dashboard/new`<br>3. Nhập Tiêu đề, chọn Nguồn (Text), chọn 3 kênh (LinkedIn, Facebook, Twitter) và nhấn "Tạo bài viết" | - Job được đưa vào hàng đợi với trạng thái `pending`/`processing`. Chuyển hướng về `/dashboard` hiển thị skeleton loading.<br>- Gemini xử lý song song (Parallel) thành công cho cả 3 kênh. Trạng thái Job đổi thành `done`. | ✅ Pass |
| **TC-11** | Soạn thảo & Tự động lưu (Autosave) | 1. Vào `/review/[jobId]` chi tiết.<br>2. Tại Tab LinkedIn, chỉnh sửa nội dung bài viết.<br>3. Dừng gõ phím 1.5 giây | - Trạng thái góc trên hiện "Đang lưu..." và chuyển sang "Đã lưu ✓" màu xanh lá sau 1 giây debounce.<br>- Tải lại trang, nội dung sửa đổi vẫn được giữ nguyên (đã lưu DB). | ✅ Pass |
| **TC-12** | Tạo lại nội dung phiên bản mới (Regenerate) | 1. Tại trang chi tiết bài viết, nhấn nút "Tạo lại / Regenerate" | - Bài viết chuyển sang trạng thái loading Skeleton.<br>- Gemini viết lại bài mới dựa trên bài gốc và Brand Voice.<br>- Giao diện hiển thị bài mới với phiên bản tăng lên (ví dụ: Version 2) và hiển thị tag "Đã chỉnh sửa". | ✅ Pass |
| **TC-13** | Sao chép bài viết (Copy) | 1. Nhấn nút "Copy" dưới chân bài viết | - Hệ thống copy bài đăng vào bộ nhớ tạm (clipboard) và hiển thị Toast màu xanh lá "Đã copy thành công!". | ✅ Pass |

---

### Kịch bản 4: Module 5 - Trải Nghiệm & Khả Năng Kháng Lỗi (Resilience & UX)
| ID | Tên Kịch Bản | Các Bước Thực Hiện | Kết Quả Mong Đợi (Pass Criteria) | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **TC-14** | Hiệu ứng tải trang (Skeletons) | 1. Truy cập vào `/dashboard` hoặc `/review/[jobId]` với đường truyền mạng chậm | - Hiển thị khung xương xám chuyển động (Skeleton Loading) tại vùng chứa bảng và khung soạn thảo thay vì màn hình trắng, giúp giao diện premium hơn. | ✅ Pass |
| **TC-15** | Tự động thử lại khi gọi AI lỗi (AI Retry) | 1. Giả lập mạng bị ngắt kết nối tạm thời hoặc Gemini trả về lỗi 503 khi đang chạy Job | - Lớp bọc `generateContentWithRetry` tự động bắt lỗi, dừng chờ 2 giây và thử gọi lại lần 2.<br>- Nếu lần 2 thành công, Job vẫn chạy trơn tru, không báo thất bại cho người dùng. | ✅ Pass |

---

### Kịch bản 5: Admin Alpha & Social Distribution
| ID | Tên Kịch Bản | Các Bước Thực Hiện | Kết Quả Mong Đợi (Pass Criteria) | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **TC-16** | Admin guard | 1. Đăng nhập bằng user `free`.<br>2. Truy cập `/admin` và `/api/admin/users` | - Trang hiển thị không có quyền hoặc API trả 403.<br>- User admin truy cập được panel. | ⏳ Cần test |
| **TC-17** | Retry failed job | 1. Tạo hoặc chọn job `failed`.<br>2. Admin bấm Retry trong `/admin` | - Job chuyển về `pending`.<br>- Inngest nhận lại event `repurpose/start` với dữ liệu cũ. | ⏳ Cần test |
| **TC-18** | Export feedback CSV | 1. Admin bấm Export feedback CSV | - Tải file `amplify-alpha-feedback.csv` có header và dữ liệu feedback. | ⏳ Cần test |
| **TC-19** | Connect social accounts | 1. Vào `/settings`.<br>2. Bấm connect X hoặc Facebook Page | - Nếu env OAuth thiếu, UI báo lỗi cấu hình.<br>- Nếu env đúng, redirect OAuth và lưu `social_accounts`. | ⏳ Cần test |
| **TC-20** | Publish approved draft | 1. Vào `/review/[jobId]`.<br>2. Bấm Publish to X hoặc Prepare Facebook | - X chặn draft >280 ký tự.<br>- Facebook mở modal preview; có thể publish Page nếu connected hoặc Copy + Open fallback. | ⏳ Cần test |

---

## 👥 4. Kế Hoạch Tổ Chức Alpha Testing (5-10 Người Dùng)

### 4.1 Tiêu chí lựa chọn người kiểm thử (Beta Testers):
* Lựa chọn 5-10 người dùng là những người làm nghề sáng tạo nội dung (Content Creator), Marketing, hoặc thường xuyên đăng bài trên LinkedIn/Facebook.
* Yêu cầu họ sử dụng thiết bị màn hình Desktop để đảm bảo hiển thị đúng thiết kế tối ưu.

### 4.2 Kế hoạch thực hiện:
1. **Tuần 1: Onboarding & Tạo Voice Profile**
   * Người dùng đăng ký tài khoản, tự tạo Brand Vault của mình bằng cả 2 cách (Flow A và Flow B).
   * Yêu cầu người dùng kiểm tra xem tag giọng văn AI phân tích có thực sự giống phong cách thường ngày của họ hay không. Họ có cần chỉnh sửa gì bằng nút "+ Thêm" hay không.
2. **Tuần 2: Sáng tạo Nội dung Thực tế**
   * Người dùng dán bài viết dài hàng ngày của họ vào để chuyển đổi ra 4 định dạng bài đăng mạng xã hội.
   * Chỉnh sửa trực tiếp trên trình soạn thảo, dùng tính năng Regenerate nếu cần AI đổi góc nhìn.
   * Copy bài đăng thực tế để post lên các kênh xã hội của họ.
3. **Tuần 3: Thu thập phản hồi**
   * Gửi biểu mẫu khảo sát (Google Form) hoặc tổ chức một kênh Discord chung để thu thập các lỗi phát sinh (bugs) và trải nghiệm về mặt tốc độ, giao diện.

---

## 📈 5. Tiêu Chí Đánh Giá Hệ Thống Hoàn Thiện (Exit Criteria)

Hệ thống được coi là hoàn thành giai đoạn Alpha và sẵn sàng mở rộng sang Beta khi đạt được các chỉ số sau:
* **Tỷ lệ kiểm thử thành công (Pass Rate):** 100% các Kịch bản kiểm thử cốt lõi (từ TC-01 đến TC-15) đều vượt qua.
* **Tỷ lệ Job thành công (AI Success Rate):** > 98% số lượng Job chuyển đổi bài đăng được hoàn thành thành công mà không bị chuyển sang trạng thái `failed`.
* **Mức độ hài lòng của người dùng Alpha:** > 80% người dùng đánh giá giao diện soạn thảo (DraftEditor) trực quan và tính năng autosave hoạt động nhạy bén.

# Cap nhat test ngay 14/06/2026

## Ket qua kiem tra thuc te trong ngay

- `npm.cmd run typecheck`: pass.
- `npm.cmd run lint`: pass.
- Browser smoke test sau chinh UI:
  - `/dashboard`: pass, dashboard clean SaaS hien thi dung Brand Vault, stats, job history.
  - `/dashboard/new`: pass, create form load dung Brand Vault active, source tabs, channel selector va submit action.
  - `/review/[jobId]`: pass, source panel, draft tabs, editor, distribution panel hien thi dung.
  - Prepare X modal: pass, co preview, Copy + Open X va chan direct publish khi qua 280 ky tu.
  - `/settings`: pass, X/Facebook account cards hien thi dung trang thai chua ket noi.
  - `/admin`: pass voi user `free`, hien thi khong co quyen truy cap.
  - Responsive mobile: pass nhanh cho dashboard/review, khong co horizontal overflow.
  - Browser console: khong co error.
- `npm.cmd run build`: timeout sau 180 giay, chua co loi cu the.

## Test cases bo sung sau UI Clean SaaS

| ID | Ten kich ban | Cac buoc thuc hien | Ket qua mong doi | Trang thai |
| :--- | :--- | :--- | :--- | :--- |
| **TC-21** | Dashboard Clean SaaS | 1. Login user co Brand Vault.<br>2. Vao `/dashboard`. | Sidebar gon, stats compact, Brand Vault card ro, job history de scan, khong con copy mojibake o vung chinh. | Pass local |
| **TC-22** | Create form compact | 1. Vao `/dashboard/new`.<br>2. Kiem tra Brand Vault, source tabs, channel buttons, title, submit. | Form chia nhom ro, selected channel de nhan biet, nut submit khong chiem qua nhieu chieu cao. | Pass local |
| **TC-23** | Review distribution approval-first | 1. Vao `/review/[jobId]`.<br>2. Bam Prepare X/Facebook/LinkedIn. | Moi provider mo buoc preview truoc; app khong tu dang neu user chua xac nhan. | Pass local voi Prepare X |
| **TC-24** | X character limit UX | 1. Mo draft dai hon 280 ky tu.<br>2. Bam Prepare X. | Modal hien thi counter, canh bao qua gioi han, nut dang truc tiep bi disabled. | Pass local |
| **TC-25** | Social settings empty state | 1. Vao `/settings` khi chua connect account. | X/Facebook cards hien thi trang thai chua ket noi, khong crash khi thieu OAuth env. | Pass local |
| **TC-26** | Mobile app shell | 1. Set viewport mobile.<br>2. Mo `/dashboard` va `/review/[jobId]`. | Co mobile header/bottom nav, khong bi horizontal overflow, action chinh van dung duoc. | Pass nhanh |
| **TC-27** | Admin guard UI | 1. Login user free.<br>2. Vao `/admin`. | User free thay man khong co quyen truy cap, khong thay du lieu admin. | Pass local |

## Cac test can chay lai

- Production build voi timeout dai hon.
- `/api/health` o trang thai anonymous.
- Full Admin Alpha Panel bang admin account that.
- OAuth connect/callback/publish that cho X va Facebook Page.
- Copy button bang browser that neu automation clipboard tiep tuc bi gioi han.
- Channel selection payload tu Create form den drafts sinh ra.
- Autosave khi switch draft tab.

---
