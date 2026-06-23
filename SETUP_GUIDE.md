# Hướng dẫn Khởi chạy Dự án Chi tiết - AI Marketing Đa Kênh

Tài liệu này cung cấp hướng dẫn từng bước để cài đặt, cấu hình cơ sở dữ liệu, khởi chạy môi trường phát triển (development) và triển khai lên môi trường thử nghiệm (production) cho nền tảng **AI Marketing Đa Kênh (Amplify)**.

---

## 💻 1. Yêu cầu hệ thống (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
* **Node.js**: Phiên bản `18.x` hoặc `20.x` trở lên.
* **npm**: Phiên bản `9.x` trở lên (thường đi kèm khi cài Node.js).
* **Git**: Để quản lý mã nguồn (tùy chọn).
* **Tài khoản Supabase**: Để khởi tạo cơ sở dữ liệu PostgreSQL và quản lý người dùng (Authentication).
* **Tài khoản Google AI Studio**: Để lấy API Key cho mô hình **Gemini 2.5 Flash**.

---

## 📂 2. Cấu trúc Dự án

Thư mục chính chứa mã nguồn ứng dụng là `/frontend`, được phát triển dựa trên **Next.js 15 (App Router)**:
* `/frontend/app`: Định nghĩa các Router, Server Components và API Routes.
* `/frontend/components`: Chứa các UI Components dùng chung và các component chuyên biệt theo module.
* `/frontend/lib`: Chứa cấu hình Supabase, Inngest client, định nghĩa TypeScript types và các helper AI.
* `supabase-schema.sql` (ở thư mục gốc): File SQL chứa cấu trúc bảng cần thiết để import vào Supabase.

---

## 🛠️ 3. Các Bước Cài Đặt & Chạy Local

### Bước 3.1: Cài đặt Dependencies
Mở Terminal (Command Prompt hoặc PowerShell trên Windows) và di chuyển vào thư mục `/frontend`:
```bash
cd "d:\Chuong Trinh Dai Hoc\chuyendetotnghiep\AI_maketing_da_kenh_web\frontend"
npm install
```

### Bước 3.2: Cấu hình biến môi trường (.env.local)
1. Trong thư mục `frontend`, sao chép file cấu hình mẫu:
   * Trên Windows (PowerShell):
     ```powershell
     cp .env.local.example .env.local
     ```
   * Trên macOS/Linux:
     ```bash
     cp .env.local.example .env.local
     ```
2. Mở file `.env.local` vừa tạo và điền đầy đủ thông tin các khóa API của bạn:
   ```env
   # Supabase Credentials (Lấy từ Supabase Project Settings -> API)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here # Bắt buộc cho background jobs

   # Google Gemini API Key (Lấy từ Google AI Studio)
   GOOGLE_AI_API_KEY=your-gemini-api-key-here

   # DeepSeek API Key (Fallback - Tùy chọn, có thể bỏ trống)
   DEEPSEEK_API_KEY=your-deepseek-key-here

   # Social Distribution (tùy chọn cho Alpha)
   TOKEN_ENCRYPTION_KEY=generate-a-long-random-string
   X_CLIENT_ID=your-x-client-id
   X_CLIENT_SECRET=your-x-client-secret
   X_REDIRECT_URI=http://localhost:3000/api/social/x/callback
   FACEBOOK_APP_ID=your-facebook-app-id
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   FACEBOOK_REDIRECT_URI=http://localhost:3000/api/social/facebook/callback
   ```

---

## 🗄️ 4. Cấu hình Cơ sở dữ liệu (Supabase Setup)

Dự án sử dụng Supabase PostgreSQL làm hệ quản trị cơ sở dữ liệu và Supabase Auth cho quản lý đăng nhập.

### Bước 4.1: Tạo các bảng dữ liệu
1. Truy cập vào [Supabase Dashboard](https://supabase.com/) và mở dự án của bạn.
2. Điều hướng tới menu **SQL Editor** ở cột bên trái.
3. Nhấn **New Query** để tạo một trang SQL trống.
4. Mở file [supabase-schema.sql](file:///d:/Chuong%20Trinh%20Dai%20Hoc/chuyendetotnghiep/AI_maketing_da_kenh_web/supabase-schema.sql) ở thư mục gốc của dự án, sao chép toàn bộ nội dung SQL và dán vào trang SQL Editor của Supabase.
5. Nhấn nút **Run** ở góc dưới bên phải. 
   > [!NOTE]
   > Lệnh SQL này sẽ tự động tạo các bảng: `profiles` (Hồ sơ người dùng), `brand_vaults` (Bộ lưu trữ giọng văn), `repurpose_jobs` (Lịch sử công việc chuyển đổi), `drafts` (Các bài viết bản nháp đã sinh), `social_accounts`, `publish_attempts`, và `alpha_feedback`.

Các bảng bổ sung cho Alpha:
* `social_accounts`: lưu tài khoản X/Facebook Page đã kết nối, token được mã hóa trước khi ghi DB.
* `publish_attempts`: lưu lịch sử publish/fallback theo từng draft.
* `alpha_feedback`: lưu feedback nội bộ để export CSV cho báo cáo chuyên đề.

### Bước 4.2: Thiết lập Trigger Đăng ký Người dùng Mới
Để tự động tạo một dòng trong bảng `profiles` khi có tài khoản mới đăng ký qua Supabase Auth, hãy chạy đoạn mã SQL trigger sau trong SQL Editor:
```sql
-- Tạo function xử lý người dùng mới đăng ký
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Tạo trigger liên kết
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## ⚡ 5. Khởi chạy Trình Quản lý Hàng đợi (Inngest Dev Server)

Dự án sử dụng **Inngest** để xử lý các tác vụ chạy ngầm mất nhiều thời gian (như cào dữ liệu từ URL, phân tích bài viết mẫu dài bằng AI, và tạo nội dung đa kênh song song).

### Bước 5.1: Cài đặt và Chạy Inngest CLI
Để ứng dụng có thể đẩy và nhận các jobs chạy ngầm khi phát triển ở local, bạn phải chạy **Inngest Dev Server**:
1. Mở một cửa sổ Terminal **mới** (giữ nguyên cửa sổ chạy Next.js).
2. Chạy lệnh khởi tạo Inngest local:
   ```bash
   npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
   ```
3. Sau khi chạy thành công, Inngest Dev Server sẽ mở tại cổng `localhost:8288`. Bạn có thể truy cập `http://localhost:8288` trên trình duyệt để kiểm tra trực quan các sự kiện và jobs đang được gửi đi!

---

## 🚀 6. Khởi chạy Ứng dụng ở Local

1. Tại Terminal đầu tiên (trong thư mục `frontend`), chạy lệnh khởi động máy chủ Next.js:
   ```bash
   npm run dev
   ```
2. Ứng dụng sẽ hoạt động tại địa chỉ: `http://localhost:3000`
3. Truy cập trình duyệt và bắt đầu trải nghiệm:
   * Vào `/register` để tạo tài khoản mới.
   * Tiến hành xây dựng **Brand Vault** thông qua 2 luồng: Phân tích bài viết/URL có sẵn (Flow A) hoặc Trả lời 5 câu hỏi nhanh (Flow B).
   * Tạo chiến dịch nội dung đa kênh mới, hệ thống sẽ gọi Gemini sinh tự động bài viết cho LinkedIn, Facebook, Twitter.
   * Chỉnh sửa, lưu tự động bài viết và tạo lại (Regenerate) trên trang Dashboard cá nhân.

Kiểm tra chất lượng source:
```bash
npm run typecheck
npm run lint
npm run build
```

Nếu Windows báo lỗi khóa file trong `.next`, hãy đóng dev server/terminal đang giữ cache rồi chạy lại build.

---

## 🌐 7. Triển khai lên Production (Vercel Deployment)

Để triển khai dự án lên Vercel để người dùng thực tế có thể truy cập:

### Bước 7.1: Liên kết Github & Deploy lên Vercel
1. Đẩy mã nguồn dự án của bạn lên một repository riêng tư trên **GitHub**.
2. Truy cập [Vercel Dashboard](https://vercel.com/) và import dự án từ GitHub.
3. Trong phần cấu hình thư mục Root, hãy chỉ định thư mục root là `frontend` (vì toàn bộ Next.js app nằm ở đây).
4. Thêm các biến môi trường (Environment Variables) trong phần Settings tương tự như file `.env.local`:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `GOOGLE_AI_API_KEY`

### Bước 7.2: Liên kết Inngest trên Production
Do môi trường Production không dùng `inngest-cli` của local, bạn cần kết nối Vercel với dịch vụ Cloud Inngest:
1. Đăng ký tài khoản miễn phí trên [Inngest Cloud](https://www.inngest.com/).
2. Thêm một ứng dụng mới và chọn kiểu kết nối qua **Webhook/URL**.
3. Chỉ định URL webhook của production là: `https://ten-mien-cua-ban.vercel.app/api/inngest`.
4. Sao chép khóa bảo mật `INNGEST_EVENT_KEY` và `INNGEST_SIGNING_KEY` do Inngest cung cấp và cấu hình chúng vào **Environment Variables** trên Vercel của bạn để xác thực an toàn giữa hai bên.
