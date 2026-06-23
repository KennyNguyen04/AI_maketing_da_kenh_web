# Master Plan v2: Nền tảng AI Marketing Đa kênh
**Bối cảnh:** Dự án cá nhân tại Việt Nam · Nhóm 50+ người dùng · Không commercial SaaS
**Ngày cập nhật:** 24/05/2026

---

## Tổng quan Sản phẩm

### Sản phẩm là gì
Một nền tảng web giúp người dùng tái chế một bài viết dài (blog, báo cáo, script video) thành nhiều bản nháp nội dung ngắn cho các kênh mạng xã hội khác nhau (LinkedIn, Facebook, X/Twitter), đảm bảo giọng văn nhất quán với thương hiệu cá nhân của từng người.

### Người dùng là ai
Solo founders, kỹ sư, product manager người Việt đang xây dựng thương hiệu cá nhân trên mạng xã hội, thiếu thời gian làm marketing, muốn tạo nội dung nhanh mà không mất đi giọng văn riêng.

### Vòng lặp giá trị cốt lõi
```
Nạp bài gốc → AI tái chế theo Brand Voice → Xem & Sửa → Copy đi đăng tay
```

### Những gì KHÔNG build trong phiên bản này
- Tự động đăng bài qua API LinkedIn/X
- Thanh toán / Stripe / Paywall
- Anti-Shadowban Scheduler
- Competitor Gap Analysis
- Chrome Extension

---

## Giai đoạn 0: Nền tảng & Quyết định Chiến lược ✅ HOÀN THÀNH

### Đã có
- Báo cáo phân tích thị trường, đối thủ (Lately.ai, Ocoya, Copy.ai, Jasper)
- Persona: "Kỹ sư Đơn độc Khát khao Tăng trưởng"
- JTBD Framework: Functional / Emotional / Social Jobs
- Kế hoạch rủi ro: API thay đổi, Model Collapse
- Master Feature List + MoSCoW MVP
- User Flow Diagram (Onboarding + Core Loop)

### Quyết định chiến lược đã chốt
- Scope: Brand Vault + Repurposing Engine + Review Dashboard
- User: 50+ người, self-register, invite-only hoặc có approval
- DB phải có sẵn field `user_plan: enum('free','pro','admin')` từ ngày 1
- Không API publishing — người dùng copy-paste thủ công

---

## Giai đoạn 1: Thiết kế Trải nghiệm & Kiến trúc Hệ thống

**Mục tiêu:** Trả lời đủ 3 câu hỏi trước khi viết dòng code đầu tiên:
1. Sản phẩm trông như thế nào? (UX/Wireframes)
2. Hệ thống hoạt động ra sao? (System Architecture)
3. Dùng công nghệ gì? (Tech Stack)

**Thời gian:** 1–2 tuần
**Kết quả bàn giao:** 4 tài liệu phác thảo (không cần đẹp, cần đủ thông tin để build)

---

### Đầu ra 1: Wireframes cho 4 màn hình chính

Không cần dùng Figma hay Miro. Vẽ trên giấy, chụp ảnh lại, hoặc dùng Excalidraw (miễn phí). Mục tiêu là xác định rõ **thông tin nào xuất hiện ở đâu** trên mỗi màn hình.

#### Màn hình 1 — Đăng ký / Đăng nhập
Thông tin cần quyết định:
- Email + Password hay OAuth (Google)?
- Có require invite code không, hay self-register tự do?
- Sau khi đăng nhập lần đầu, chuyển thẳng đến đâu?

Gợi ý đơn giản nhất: Email + Password, self-register, sau đăng nhập → chuyển đến màn hình Setup Brand Vault nếu chưa có, chuyển đến Dashboard nếu đã có.

#### Màn hình 2 — Setup Brand Vault (Onboarding)
Đây là màn hình quan trọng nhất về UX. Người dùng mới sẽ thấy màn hình này đầu tiên. Cần phác thảo 2 luồng:

**Luồng A — Có content sẵn:**
- Một ô nhập URL hoặc paste text
- Nút "Phân tích giọng văn"
- Màn hình loading với text mô tả AI đang làm gì
- Màn hình xác nhận: hiển thị các đặc điểm giọng văn AI trích xuất được (tone, từ khóa hay dùng, độ dài câu trung bình), cho phép người dùng chỉnh sửa trước khi lưu

**Luồng B — Chưa có content (Cold Start):**
- Form 5 câu hỏi ngắn:
  1. Bạn viết về chủ đề gì? (free text)
  2. Giọng văn của bạn thiên về? (Chuyên nghiệp / Gần gũi / Hài hước / Trực tiếp)
  3. Đối tượng đọc của bạn là? (free text)
  4. Bạn thường dùng văn phong nào? (Học thuật / Kể chuyện / Bullet points / Hỗn hợp)
  5. Paste 1–3 câu mẫu bạn từng viết (optional)

#### Màn hình 3 — Dashboard chính
Thành phần cần xuất hiện:
- Trạng thái Brand Vault (đã setup chưa, tên voice profile)
- Nút "Tạo nội dung mới" — to, nổi bật, ở trên cùng
- Danh sách các lần tạo nội dung gần đây (title, ngày tạo, trạng thái: Draft / Done)
- Link vào Review Dashboard cho từng item

#### Màn hình 4 — Review Dashboard
Đây là màn hình người dùng dành nhiều thời gian nhất. Cần có:
- Phía trái: bài gốc được nạp vào (để tham chiếu)
- Phía phải: các bản nháp được tạo ra, phân theo kênh (LinkedIn Post, LinkedIn Thread, Facebook, X/Twitter)
- Mỗi bản nháp: text editor inline (chỉnh sửa trực tiếp), nút Copy, tag kênh
- Nút "Regenerate" cho từng bản nháp nếu không hài lòng
- Nút "Đánh dấu Hoàn thành" cho cả batch

---

### Đầu ra 2: System Architecture Blueprint

#### Sơ đồ thành phần hệ thống

```
[Browser]
    │
    │ HTTPS
    ▼
[Frontend — Next.js]
    │
    │ REST API calls
    ▼
[Backend — Next.js API Routes / hoặc FastAPI]
    │
    ├──────────────────┬─────────────────────┐
    │                  │                     │
    ▼                  ▼                     ▼
[Supabase DB]    [Job Queue]          [AI Service]
(PostgreSQL)     (Inngest)            (Gemini API)
    │                  │
    │         [Background Workers]
    │         - Phân tích Brand Vault
    │         - Tái chế nội dung
    ▼
[Supabase Storage]
(Lưu file upload nếu có)
```

#### Luồng dữ liệu chi tiết

**Luồng 1 — Setup Brand Vault:**
1. User submit URL hoặc text → Frontend gửi POST `/api/brand-vault/analyze`
2. Backend nhận, tạo job trong Job Queue, trả về `job_id` ngay lập tức (không block)
3. Worker lấy job, gọi AI để phân tích → trích xuất voice profile → lưu vào DB
4. Frontend polling hoặc dùng Supabase Realtime để biết khi job xong
5. Kết quả hiển thị lên màn hình xác nhận

**Luồng 2 — Tạo nội dung:**
1. User submit bài gốc (URL hoặc text) + chọn kênh muốn tạo
2. Backend tạo một `repurpose_job`, đẩy vào queue, trả về `job_id`
3. Worker lấy job → load Brand Voice từ DB → ghép vào prompt → gọi AI → lưu các bản nháp vào DB
4. Frontend cập nhật trạng thái, chuyển người dùng sang Review Dashboard

**Luồng 3 — Review & Chỉnh sửa:**
1. Người dùng chỉnh sửa text trực tiếp trên UI
2. Frontend gọi PATCH `/api/drafts/:id` mỗi khi người dùng dừng gõ (debounced autosave)
3. Không cần confirm — lưu tự động

#### Các thành phần cần quyết định thêm
- Dùng Supabase Realtime (WebSocket) hay polling để cập nhật trạng thái job?
  → Gợi ý: dùng polling mỗi 2 giây cho đơn giản, chuyển Realtime sau nếu cần
- Job Queue: dùng Inngest (managed, free tier đủ dùng) hay BullMQ (tự host với Redis)?
  → Gợi ý: Inngest cho giai đoạn đầu, không cần quản lý Redis

---

### Đầu ra 3: Data Model (Schema DB cơ bản)

Đây là bản phác thảo, không phải schema cuối cùng. Cần thiết kế trước để tránh refactor lớn sau.

**Bảng `profiles`** (extend Supabase Auth — tạo tự động bằng trigger khi user đăng ký)

> ⚠️ Supabase Auth quản lý người dùng trong `auth.users` — không thể thêm cột tùy chỉnh trực tiếp vào schema đó. Phải tạo bảng `public.profiles` riêng, liên kết qua `auth.users(id)`. Bỏ qua bước này sẽ khiến `user_plan` không có chỗ lưu và RLS không hoạt động đúng.

```
id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
email          text                        -- copy từ auth.users khi tạo
user_plan      text NOT NULL DEFAULT 'free' -- 'free' | 'pro' | 'admin'
created_at     timestamptz DEFAULT now()
```

Trigger tự động tạo profile sau đăng ký (thêm vào Supabase SQL Editor khi setup):
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Bảng `brand_vaults`**
```
id                  uuid PRIMARY KEY
user_id             uuid REFERENCES auth.users(id) ON DELETE CASCADE
name                text                        -- "Giọng văn chính của tôi"
voice_profile       jsonb                       -- Chỉ chứa dữ liệu phân tích (tone, style, phrases...)
system_prompt       text                        -- Tách riêng khỏi voice_profile, rebuild mỗi khi user lưu
source_type         text                        -- 'url' | 'text' | 'form'
raw_input           text                        -- URL hoặc text gốc user nạp vào
is_active           boolean DEFAULT true
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

> ⚠️ `system_prompt` được tách thành cột riêng (không nhúng vào `voice_profile` JSONB) để dễ update độc lập. Mỗi khi user xác nhận / chỉnh sửa voice profile → backend **phải rebuild `system_prompt`** từ `voice_profile` mới trước khi lưu. Nếu bỏ qua bước này, người dùng chỉnh sửa giọng văn nhưng AI vẫn dùng prompt cũ.

Cấu trúc `voice_profile` (JSON):
```json
{
  "tone": ["professional", "direct", "no-jargon"],
  "sentence_style": "short",
  "avg_sentence_length": 15,
  "signature_phrases": ["Thực ra là", "Nói thẳng ra"],
  "topics": ["product", "engineering", "startup"],
  "avoid": ["hashtag_spam", "emoji_overuse"],
  "system_prompt_cache": "Bạn là trợ lý viết nội dung..."
}
```

**Bảng `repurpose_jobs`**
```
id             uuid PRIMARY KEY
user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE
brand_vault_id uuid REFERENCES brand_vaults(id)
title          text                        -- Tiêu đề do user đặt hoặc auto-generate
source_type    text                        -- 'url' | 'text'
source_content text                        -- Nội dung bài gốc
channels       text[]                      -- ['linkedin_post', 'linkedin_thread', 'facebook', 'twitter']
status         text DEFAULT 'pending'      -- 'pending' | 'processing' | 'done' | 'failed'
error_message  text                        -- Lý do thất bại, chỉ có giá trị khi status = 'failed'
created_at     timestamptz DEFAULT now()
```

**Bảng `drafts`**
```
id             uuid PRIMARY KEY
job_id         uuid REFERENCES repurpose_jobs(id) ON DELETE CASCADE
user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE
channel        text                        -- 'linkedin_post', 'twitter', v.v.
content        text                        -- Nội dung bản nháp
is_edited      boolean DEFAULT false       -- Người dùng đã tự sửa chưa
is_done        boolean DEFAULT false       -- Đã đánh dấu hoàn thành chưa
is_current     boolean DEFAULT true        -- false khi bị thay thế bởi version mới (regenerate)
version        int DEFAULT 1               -- Tăng mỗi lần regenerate
created_at     timestamptz DEFAULT now()
updated_at     timestamptz DEFAULT now()
```

> Khi regenerate: set `is_current = false` cho draft cũ cùng channel → tạo draft mới với `is_current = true`, `version + 1`. Query hiển thị chỉ lấy `WHERE is_current = true`.

---

### Đầu ra 4: Tech Stack — Quyết định và Lý do

#### Frontend
**Chọn: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + React 19**

Lý do: Next.js cho phép viết cả API routes trong cùng một project, giảm overhead khi chỉ có một người build. TypeScript bắt lỗi sớm, tiết kiệm thời gian debug sau này. Tailwind giúp tạo UI nhanh mà không cần viết CSS riêng. React 19 với Server Components và các hooks mới giúp tối ưu hiệu suất rendering.

Deploy: Vercel (free tier đủ dùng, zero config, tích hợp sẵn với Next.js)

#### Backend
**Chọn: Next.js API Routes (cùng project với Frontend)**

Lý do: Với scope hiện tại, không cần tách backend riêng. API Routes của Next.js đủ mạnh để handle auth, CRUD, và gọi AI. Tách ra FastAPI chỉ thêm complexity không cần thiết ở giai đoạn này.

Khi nào cần tách: Khi có background worker nặng hoặc cần scale riêng biệt — để sau Phase 4.

#### Database & Auth
**Chọn: Supabase (PostgreSQL + Auth + Storage + Realtime)**

Lý do: Supabase cho 1 project miễn phí với 500MB database và 1GB storage — đủ cho 50+ người dùng giai đoạn đầu. Auth có sẵn (email/password, OAuth Google), không cần tự implement. Row Level Security (RLS) đảm bảo data isolation giữa các users mà không cần viết middleware phức tạp.

Lưu ý quan trọng: Bật RLS cho tất cả các bảng ngay từ đầu. Policy cơ bản: `user_id = auth.uid()`.

#### Job Queue
**Chọn: Inngest (chạy trên Inngest Cloud, không phải trực tiếp trong Vercel function)**

Lý do: Không cần tự host Redis hay Bull. Inngest là managed service, có free tier, hỗ trợ retry tự động, có dashboard để debug failed jobs.

> ⚠️ **Vercel free tier timeout 10 giây:** Một repurpose job gọi Gemini tuần tự 4 lần có thể mất 60–120 giây, vượt xa giới hạn này và bị kill silently (job stuck ở `processing` mãi không done). Giải pháp bắt buộc: (1) Cấu hình Inngest worker chạy trên **Inngest Dev Server** (local) hoặc **Inngest Cloud** tách khỏi Vercel serverless function. (2) Gọi Gemini cho 4 kênh **song song** bằng `Promise.all()` thay vì tuần tự, giảm tổng thời gian từ ~120s xuống ~30s. Cả hai phải được implement từ Ngày 13 — không phải là optimization để sau.

#### AI / LLM
**Chọn: Google Gemini API (gemini-2.5-flash) qua SDK `@google/genai`**

Lý do: Gemini 2.5 Flash có tốc độ phản hồi nhanh, hỗ trợ tiếng Việt tốt, và có free tier từ Google AI Studio — phù hợp cho dự án cá nhân không thương mại. SDK `@google/genai` (v2.3.0) cung cấp API hiện đại với class `GoogleGenAI`.

Chiến lược chịu lỗi: Thay vì dùng fallback sang model khác (quota free tier giới hạn cho nhiều model), áp dụng **retry với exponential backoff** (3s → 6s → 12s → 24s, tối đa 4 lần) cho các lỗi tạm thời (503, 429, UNAVAILABLE, RESOURCE_EXHAUSTED).

Chi phí: Miễn phí (Google AI Studio free tier, giới hạn 15 RPM). Khi cần scale lên 50+ users đồng thời → nâng cấp lên Gemini API trả phí hoặc chuyển sang Claude/OpenAI.

#### Chiến lược lưu Brand Voice trong DB
**Chọn: JSON config + cached System Prompt**

Không dùng vector embeddings ở giai đoạn này vì: phức tạp, cần thêm infrastructure (pgvector hoặc Pinecone), và chưa cần thiết.

Cách hoạt động:
1. AI phân tích nội dung mẫu → trích xuất `voice_profile` dạng JSON
2. Khi cần tạo nội dung, backend đọc `voice_profile` → ghép thành System Prompt → gọi LLM
3. System Prompt được cache trong field `system_prompt_cache` của `brand_vaults`, chỉ regenerate khi user update Brand Vault

Ví dụ System Prompt được tạo ra từ voice_profile:
```
Bạn là trợ lý viết nội dung marketing cho một cá nhân có phong cách viết cụ thể.

GIỌNG VĂN: Chuyên nghiệp nhưng gần gũi, không dùng thuật ngữ hàn lâm phức tạp.
ĐỘ DÀI CÂU: Ngắn và súc tích. Câu trung bình 12-15 từ.
CỤM TỪ HAY DÙNG: "Thực ra là", "Nói thẳng ra", "Điều quan trọng hơn là"
CHỦ ĐỀ THƯỜNG VIẾT: Product development, engineering management, startup life
TRÁNH: Hashtag quá nhiều, emoji, ngôn ngữ sales quá lộ liễu

Khi tạo nội dung, hãy đảm bảo giữ đúng giọng văn này cho dù đang viết cho kênh nào.
```

---

## Giai đoạn 2: Phát triển MVP

**Mục tiêu:** Có sản phẩm chạy được end-to-end: từ setup Brand Vault → tái chế nội dung → review trên dashboard.
**Thời gian:** 4–5 tuần (33 ngày làm việc)
**Nguyên tắc:** Làm cho nó chạy đúng trước, đẹp sau.

---

### POC — Proof of Concept Kỹ thuật (Trước Ngày 1)

Làm trước khi bắt đầu bất cứ module nào. Mục tiêu là phát hiện sớm 2 điểm có thể "đụng tường" kỹ thuật, tránh build xong rồi mới phát hiện không khả thi.

**Thời gian:** Nửa ngày (4–6 giờ). Không cần project chuẩn, không cần Vercel, chỉ cần máy local.

---

**Task 1 — Test URL Scraper (2 giờ)**

Viết một script Node.js nhỏ chạy thẳng, thử cào 5 URL blog từ các nguồn khác nhau (blog cá nhân, Medium, Substack, LinkedIn article, Viblo). Không cần framework, không cần cấu trúc thư mục:

```javascript
// poc-scraper.mjs  (chạy: node poc-scraper.mjs)
// Node 18+ có sẵn fetch, không cần node-fetch
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const urls = [
  'https://your-blog.com/bai-viet-1',      // blog cá nhân
  'https://medium.com/@you/article',        // Medium
  'https://substack.com/...',               // Substack
  'https://viblo.asia/p/...',               // Viblo (public, không cần login)
  'https://toidicodedao.com/...',           // Blog kỹ thuật tiếng Việt (public)
  // KHÔNG dùng linkedin.com/pulse — yêu cầu đăng nhập, luôn fail
];

for (const url of urls) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }
    });
    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();
    const wordCount = article?.textContent?.split(/\s+/).length ?? 0;
    console.log(`✅ ${url} → ${wordCount} từ`);
  } catch (e) {
    console.log(`❌ ${url} → ${e.message}`);
  }
}
```

**Tiêu chí quyết định sau Task 1:**
- Nếu ≥ 3/5 URL lấy được text đọc được → giữ tính năng URL, build vào Ngày 9 của Module 2
- Nếu < 3/5 URL bị block (403, Cloudflare, JS-only rendering) → hạ tính năng URL xuống "optional nâng cao", dồn toàn lực vào luồng Paste Text ở MVP

---

**Task 2 — Test Prompt phân tích giọng văn trên Google AI Studio (4 giờ)**

Không viết API. Mở Google AI Studio (aistudio.google.com), chọn model `gemini-2.5-flash`, dán prompt dưới đây kèm một bài viết thật của bạn, quan sát kết quả. Lặp lại với ít nhất 3 bài viết có phong cách khác nhau:

```
Phân tích giọng văn của đoạn văn bản sau.
Chỉ trả về JSON theo đúng schema dưới đây, không thêm bất kỳ text nào khác.

Schema:
{
  "tone": ["mảng tính từ mô tả giọng văn, tối đa 5"],
  "sentence_style": "short | medium | long | varied",
  "avg_sentence_length": <số từ trung bình mỗi câu>,
  "signature_phrases": ["cụm từ hay xuất hiện, tối đa 5"],
  "topics": ["chủ đề chính, tối đa 5"],
  "avoid": ["điều AI nên tránh khi viết theo giọng này, tối đa 4"]
}

Văn bản cần phân tích:
[DÁN BÀI VIẾT VÀO ĐÂY]
```

Sau mỗi lần chạy, dán kết quả vào `JSON.parse()` trên browser console để kiểm tra tính hợp lệ.

**Tiêu chí quyết định sau Task 2:**
- JSON hợp lệ và parse được trong cả 3 lần → dùng prompt này làm baseline, không cần thêm gì
- JSON thường bị invalid (thiếu dấu ngoặc, thêm text thừa) → cần thêm bước validate + retry trong Inngest worker
- Kết quả tone sai rõ rệt so với cảm nhận thật → cần thêm few-shot examples (dán 1–2 đoạn "ví dụ tốt" vào prompt)

---

**Ghi lại 2 quyết định trước khi bắt đầu Ngày 1:**

| Quyết định | Kết quả POC | Hành động |
|------------|-------------|-----------|
| URL Scraping | Pass / Fail | Build Ngày 9 / Bỏ qua |
| Prompt JSON | Stable / Unstable | Dùng ngay / Thêm retry logic |

---

### Module 0 — Project Setup (Ngày 1–2)

**Công việc:**
- Khởi tạo Next.js 15 project với TypeScript, Tailwind CSS v4 và React 19
- Setup Supabase project: tạo database, bật Auth (Email/Password)
- Tạo schema database theo Data Model ở Giai đoạn 1
- Bật Row Level Security cho tất cả bảng
- Setup Inngest trong project
- Deploy lên Vercel, kết nối với Supabase
- Tạo file `.env.local` với các biến môi trường cần thiết

**Kiểm tra xong khi:** Truy cập được URL Vercel, login được bằng email test, thấy database có đúng schema trên Supabase dashboard.

**Cạm bẫy cần tránh:**
- Đừng bỏ RLS vì "để sau". RLS phải bật từ ngày 1, add policy sau khi bật.
- Commit `.env.local` lên git → mất API key. Dùng Vercel environment variables.
- Supabase free tier **tự pause project sau 1 tuần không có traffic**. Trong quá trình dev nếu nghỉ dài, database có thể bị pause — resume mất vài phút. Không phải lỗi code, chỉ cần vào Supabase dashboard resume lại.
- Logging lỗi trực tiếp qua `console.error()` trong các API routes và Inngest workers. Trong giai đoạn dev local, log hiển thị trên terminal và Inngest Dev Server dashboard — đủ để debug mà không cần thêm service bên ngoài.

---

### Module 1 — Authentication & User Management (Ngày 3–5)

**Công việc:**
- Trang `/login`: form email + password, xử lý error
- Trang `/register`: form đăng ký, sau đăng ký → redirect đến onboarding
- Middleware Next.js: bảo vệ các route cần auth, redirect về `/login` nếu chưa login
- Tạo profile user trong DB sau khi đăng ký thành công (trigger hoặc API call)
- Field `user_plan` mặc định là `'free'`

**Kiểm tra xong khi:** Đăng ký được tài khoản mới, login/logout hoạt động, truy cập route protected khi chưa login → bị redirect về `/login`.

**Ghi chú:** Chưa cần quản lý user từ admin panel. Người dùng đầu tiên tạo thủ công qua Supabase dashboard và set `user_plan = 'admin'`.

---

### Module 2 — Brand Vault (Ngày 6–13)

Đây là phần khó nhất và quan trọng nhất. Dành nhiều thời gian nhất ở đây.

**Lịch trình ngày cụ thể:**

| Ngày | Việc cần làm | Kết quả cụ thể |
|------|--------------|----------------|
| 6 | Tạo bảng `brand_vaults` trên Supabase, viết migration SQL, bật RLS, thêm policy `user_id = auth.uid()` | Bảng xuất hiện đúng trên Supabase dashboard, RLS báo "enabled" |
| 7 | Build API `POST /api/brand-vault/analyze-text` nhận raw text + setup Inngest function skeleton (chỉ log input, chưa gọi AI) | Gọi API từ Postman → thấy log xuất hiện trong Inngest dashboard |
| 8 | Tích hợp Gemini API (`@google/genai`) vào Inngest worker, test parse JSON trả về, lưu `voice_profile` + `system_prompt` vào DB | Dán text vào API → 30–60 giây sau thấy `voice_profile` có data trong Supabase |
| 9 *(tùy chọn)* | Build API `POST /api/brand-vault/analyze-url` với `jsdom` + `@mozilla/readability` — **chỉ làm nếu POC URL thành công** | Nạp URL → nhận được text đã extract, pipeline xử lý như text thường |
| 10–12 | Build Frontend: trang `/onboarding`, wizard chọn luồng A/B, component URL input, component form 5 câu hỏi, loading state, màn hình xác nhận có thể edit tags | Điền form trên browser → thấy voice profile hiển thị dưới dạng tags có thể chỉnh sửa |
| 13 | Fix bug, test end-to-end cả 2 luồng trên Vercel với tài khoản thật (không dùng localhost) | Người khác đăng ký tài khoản mới, setup Brand Vault thành công lần đầu |

**Công việc — Backend:**

*Phân tích URL:*
- API `POST /api/brand-vault/analyze-url`: nhận URL, fetch nội dung trang web, trích xuất text chính (bỏ navigation, footer, ads)
- Thư viện: `jsdom` để parse HTML DOM, `@mozilla/readability` để trích xuất main content
- Giới hạn: chỉ xử lý tối đa 5000 từ đầu tiên từ URL

*Phân tích text:*
- API `POST /api/brand-vault/analyze-text`: nhận raw text từ user paste vào

*Worker phân tích AI:*
- Inngest function: nhận text đầu vào → gọi Gemini API với prompt phân tích giọng văn → parse output JSON (dùng hàm `cleanAndParseJson` để xử lý JSON không chuẩn từ LLM) → lưu vào `brand_vaults`
- Prompt phân tích cần trả về: tone, sentence_style, avg_sentence_length, signature_phrases, topics, avoid

*Ví dụ Prompt phân tích giọng văn:*
```
Phân tích giọng văn của đoạn văn bản sau và trả về JSON theo đúng schema.
Chỉ trả về JSON, không thêm text nào khác.

Schema:
{
  "tone": ["mảng các tính từ mô tả giọng văn"],
  "sentence_style": "short | medium | long | varied",
  "avg_sentence_length": số từ trung bình mỗi câu,
  "signature_phrases": ["các cụm từ hay xuất hiện"],
  "topics": ["các chủ đề chính"],
  "avoid": ["những điều cần tránh dựa trên phong cách hiện tại"]
}

Văn bản cần phân tích:
[TEXT]
```

*API xác nhận và lưu:*
- API `POST /api/brand-vault`: nhận `voice_profile` đã được user xác nhận (có thể đã chỉnh sửa tags/tone trên UI) → **rebuild `system_prompt` từ `voice_profile` mới** → lưu cả `voice_profile` và `system_prompt` vào DB trong cùng một transaction. Không dùng lại system_prompt từ bước phân tích trước vì user có thể đã thay đổi.

*Luồng Cold Start (form):*
- API `POST /api/brand-vault/from-form`: nhận answers từ form 5 câu hỏi → gọi AI để convert thành voice_profile JSON → lưu

**Công việc — Frontend:**

- Trang `/onboarding`: wizard 2 bước (chọn luồng A hay B)
- Component `BrandVaultSetupURL`: input URL, nút submit, loading state, màn hình confirm kết quả
- Component `BrandVaultSetupForm`: form 5 câu hỏi, loading state, màn hình confirm kết quả
- Component `VoiceProfilePreview`: hiển thị kết quả phân tích dạng tags/chips, cho phép user edit trực tiếp trước khi lưu

**Kiểm tra xong khi:**
- Nạp URL bài blog cá nhân → thấy voice profile được trích xuất đúng trong 30–60 giây
- Điền form 5 câu hỏi → thấy voice profile được tạo ra hợp lý
- Voice profile được lưu vào DB, xuất hiện trên Dashboard

**Cạm bẫy cần tránh:**
- URL fetch có thể bị block bởi CORS hoặc bot protection → cần handle error gracefully, hướng dẫn user paste text thay thế
- LLM có thể trả về JSON không hợp lệ → luôn validate và có fallback

---

### Module 3 — Repurposing Engine (Ngày 14–22)

**Lịch trình ngày cụ thể:**

| Ngày | Việc cần làm | Kết quả cụ thể |
|------|--------------|----------------|
| 14 | Build API `POST /api/jobs` + Inngest function `repurpose-content` skeleton (nhận job, log, chưa gọi AI) + cấu hình Inngest Cloud | Submit job từ Postman → record xuất hiện trong DB với status `pending` |
| 15 | Tích hợp Gemini API vào worker cho **kênh LinkedIn Post**, test output với 2–3 bài mẫu thật | Worker chạy xong → draft LinkedIn Post xuất hiện trong bảng `drafts` |
| 16 | Mở rộng worker xử lý đủ 4 kênh bằng **`Promise.all()`** (gọi song song, không tuần tự), kiểm tra định dạng từng kênh | 1 job tạo ra đúng 4 drafts trong <30 giây, mỗi draft đúng format kênh |
| 17 | Build polling endpoint `GET /api/jobs/:id`, test async flow end-to-end (submit → worker → done) | Polling 2 giây một lần → status chuyển `pending → processing → done` đúng |
| 18–19 | Build Frontend: `NewJobForm` (chọn Brand Vault, input bài, chọn kênh), `JobStatusPoller`, redirect tự động sang Review Dashboard | Submit form trên UI → thấy loading → tự động chuyển sang trang review |
| 20 | Verify qua Supabase table viewer hoặc API call trực tiếp: 4 bản nháp tồn tại đúng format trong DB | Thấy 4 rows trong bảng `drafts` với `is_current = true`, content có nội dung thật |
| 21 | Fix bug, test với 3+ loại bài đầu vào khác nhau (bài ngắn, bài dài, bài kỹ thuật, bài kể chuyện) | Output đọc được và có vẻ đúng với từng loại bài |
| 22 | Buffer / xử lý edge cases: bài quá ngắn (<200 từ), bài có ký tự đặc biệt, lỗi Gemini API → job failed với error_message rõ ràng | Worker handle gracefully, không crash, status = 'failed' có error_message |

**Công việc — Backend:**

*Tạo job:*
- API `POST /api/jobs`: nhận `source_type`, `source_content` hoặc URL, `channels[]`, `brand_vault_id` → tạo record trong `repurpose_jobs` với status `pending` → push Inngest event → trả về `job_id`

*Worker tái chế nội dung:*
- Inngest function `repurpose-content`: load Brand Vault → lấy `system_prompt` → gọi Gemini **song song** cho tất cả channels bằng `Promise.all()` → lưu vào `drafts` với `is_current = true` → update job status thành `done`
- Nếu có lỗi: catch exception → update `status = 'failed'`, ghi `error_message` rõ ràng vào DB → không để job stuck ở `processing`
- Mỗi lần gọi Gemini được bọc trong `generateContentWithRetry()` với exponential backoff (3s, 6s, 12s, 24s) cho lỗi 503/429

*Prompt template cho từng kênh:*

LinkedIn Post (dạng bài viết ngắn):
```
System: [voice_profile.system_prompt_cache]

User: Dựa trên bài viết gốc dưới đây, hãy viết một LinkedIn post.
Yêu cầu:
- Độ dài: 150-300 từ
- Bắt đầu bằng một câu hook mạnh (không bắt đầu bằng "Tôi")
- Có 1-2 insight chính
- Kết thúc bằng một câu hỏi để tạo engagement
- Không dùng quá 3 hashtag
- Giữ đúng giọng văn đã chỉ định trong system prompt

Bài viết gốc:
[SOURCE_CONTENT]
```

LinkedIn Thread (chuỗi bài):
```
Viết một LinkedIn thread gồm 5-7 posts ngắn.
Post 1: Hook + setup vấn đề
Post 2-5: Mỗi post là một insight hoặc bước
Post cuối: Takeaway + CTA
Phân cách mỗi post bằng "---"
```

Facebook:
```
Viết một Facebook post casual hơn, có thể dài hơn, kể chuyện nhiều hơn.
Độ dài 200-400 từ. Tone gần gũi hơn LinkedIn.
```

X/Twitter:
```
Viết một tweet ngắn dưới 280 ký tự.
Hook mạnh, một insight duy nhất, không hashtag.
```

*Polling endpoint:*
- API `GET /api/jobs/:id`: trả về status và drafts khi done

**Công việc — Frontend:**

- Component `NewJobForm`: chọn Brand Vault, input bài gốc (URL hoặc paste text), checkbox chọn kênh, nút Submit
- Component `JobStatusPoller`: polling `/api/jobs/:id` mỗi 2 giây, hiển thị progress
- Khi job done → tự động redirect sang Review Dashboard

**Kiểm tra xong khi:**
- Submit một bài blog → thấy 4 bản nháp (LinkedIn Post, Thread, Facebook, Twitter) xuất hiện trong Review Dashboard sau 30–90 giây
- Các bản nháp nghe có vẻ giống giọng văn của brand vault

---

### Module 4 — Review Dashboard (Ngày 23–29)

**Lịch trình ngày cụ thể:**

| Ngày | Việc cần làm | Kết quả cụ thể |
|------|--------------|----------------|
| 23 | Build API `GET /api/jobs/:id/drafts` (chỉ trả `is_current = true`) + `PATCH /api/drafts/:id` (autosave) | Gọi PATCH từ Postman → content update trong DB, `is_edited = true` |
| 24 | Build API `POST /api/drafts/:id/regenerate` (set cũ `is_current = false`, tạo mới `is_current = true`, `version + 1`) + `GET /api/jobs` | Regenerate → draft mới xuất hiện, draft cũ không bị xoá, UI chỉ thấy draft mới |
| 25 | Build Frontend trang `/dashboard`: danh sách jobs, status badge, link vào từng review | Dashboard hiển thị đúng danh sách jobs, click link → vào đúng trang review |
| 26–27 | Build Frontend trang `/review/:jobId`: layout 2 cột, tabs theo kênh, textarea editor, nút Copy, nút Regenerate | Chỉnh sửa text → tự động lưu sau 1 giây. Bấm Copy → clipboard có đúng nội dung |
| 28 | Fix bug, test autosave, copy, regenerate, mark as done | Dùng incognito tab, không gặp lỗi đỏ trên console |
| 29 | **Integration test end-to-end hoàn chỉnh:** đăng ký → Brand Vault → submit bài → xem 4 bản nháp → chỉnh sửa → copy. Đây là lần đầu tiên test toàn bộ luồng trên UI thật | Người dùng khác (không phải bạn) thực hiện được toàn bộ luồng trong <10 phút |

**Công việc — Backend:**

- API `GET /api/jobs/:id/drafts`: lấy tất cả drafts của một job
- API `PATCH /api/drafts/:id`: update content (autosave), update `is_done`, `is_edited`
- API `POST /api/drafts/:id/regenerate`: tạo lại một draft cụ thể (tạo job mới chỉ cho channel đó, tăng `version`)
- API `GET /api/jobs`: lấy danh sách jobs của user (cho Dashboard chính)

**Công việc — Frontend:**

*Trang `/dashboard`:*
- Nút "Tạo nội dung mới" nổi bật
- Status Brand Vault (đã setup / chưa setup)
- Bảng danh sách jobs gần đây: title, ngày, status, link vào review

*Trang `/review/:jobId`:*
- Layout 2 cột: trái (source content, thu nhỏ được) / phải (drafts)
- Mỗi draft: tab theo kênh, text editor (contenteditable hoặc textarea), character count, nút Copy, nút Regenerate
- Autosave: debounce 1 giây sau khi ngừng gõ, gọi PATCH
- Nút Copy: copy text vào clipboard, đổi icon thành checkmark 2 giây
- Nút Regenerate: confirm dialog → gọi API → loading state → cập nhật content
- Nút "Đánh dấu Hoàn thành": update `is_done = true` cho tất cả drafts của job

**Kiểm tra xong khi:**
- Mở Review Dashboard, thấy đủ 4 bản nháp
- Chỉnh sửa text → tự động lưu (không cần bấm Save)
- Copy nội dung một bản nháp sang clipboard thành công
- Regenerate một bản nháp → thấy nội dung mới sau vài giây

---

### Module 5 — Polish, Error Handling & Resilience (Ngày 30–33)

**Lịch trình ngày cụ thể:**

*Ngày 30 — Error states & UX:*
- Xử lý tất cả error states: hiển thị error message thân thiện thay vì crash
- Loading skeletons cho các component chờ data
- Empty states: khi chưa có Brand Vault, khi chưa có jobs
- Toast notifications cho các actions (save, copy, error, job failed)

*Ngày 31 — Resilience:*
- Implement retry với exponential backoff trong hàm `generateContentWithRetry()`: khi Gemini trả về lỗi 503/429/UNAVAILABLE/RESOURCE_EXHAUSTED → retry tự động lên đến 4 lần với khoảng cách tăng dần (3s → 6s → 12s → 24s) → nếu vẫn fail → `status = 'failed'` với `error_message` rõ ràng
- Test resilience bằng cách gửi nhiều request liên tục để trigger rate limit của free tier

*Ngày 32 — Responsive & stability:*
- Responsive cơ bản: kiểm tra trên màn hình 1280px và 1440px (không cần mobile)
- Kiểm tra với nhiều loại bài đầu vào: bài ngắn (<200 từ), bài dài (>3000 từ), bài tiếng Anh, bài hỗn hợp Anh-Việt

*Ngày 33 — Final check:*
- Chạy toàn bộ luồng end-to-end lần cuối trên Vercel với tài khoản thật
- Kiểm tra Inngest Dev Server dashboard: không có failed jobs từ các lần test trước còn sót

---

## Giai đoạn 3: Testing & Ra mắt kín

**Mục tiêu:** Xác nhận sản phẩm thực sự hữu ích với người dùng thật.
**Thời gian:** 1–2 tuần

### Checklist trước khi mời người dùng

**Kỹ thuật:**
- Đăng ký/login hoạt động ổn định
- Brand Vault: cả 2 luồng (URL và Form) không crash
- Repurposing: job không bị stuck ở trạng thái pending
- Review Dashboard: autosave và copy hoạt động
- Không có lỗi console trên Chrome/Firefox
- Test với 2–3 loại bài viết khác nhau

**Nội dung:**
- Viết hướng dẫn sử dụng ngắn (5 bước, có screenshot)
- Chuẩn bị câu trả lời cho câu hỏi thường gặp: "AI có lưu nội dung của tôi không?", "Có bị giới hạn không?"

### Cách mời người dùng Alpha

Mời 5–10 người đầu tiên, không phải 50 người. Mục tiêu là quality feedback, không phải số lượng.

Tiêu chí chọn người test: đang tích cực viết content trên mạng xã hội, có ít nhất 3–5 bài viết để dùng làm Brand Vault, sẵn sàng cho feedback thật.

Cách invite: tạo link invite Supabase hoặc share link đăng ký, kèm hướng dẫn sử dụng.

### Thu thập Feedback

Không cần tool phức tạp. Chỉ cần:
- Google Form gắn vào cuối hướng dẫn sử dụng
- Hoặc Notion form
- Hoặc video call 15 phút với 3–5 người trong nhóm

Các câu hỏi cần hỏi:
1. Bạn có hoàn thành được từ lúc đăng ký đến lúc có bản nháp đầu tiên trong vòng 5 phút không?
2. Đọc các bản nháp, bạn thấy nó có nghe giống giọng của bạn không? (thang điểm 1–5)
3. Điểm nào gây khó chịu hoặc bạn không hiểu?
4. Bạn có dùng lại tuần sau không? Tại sao?

### Định nghĩa "Phase 3 thành công"

Phase 3 thành công khi, với **ít nhất 5 người** tham gia test:
- Ít nhất **4 người** hoàn thành từ đăng ký đến có bản nháp đầu tiên trong vòng 5 phút
- Ít nhất **3 người** cho điểm giống giọng văn từ 3/5 trở lên
- **Không có lỗi nghiêm trọng** nào (crash, job stuck, mất data) trong toàn bộ quá trình test

Nếu không đạt → quay lại Module 2 sửa Brand Vault analysis trước, không vội mở rộng.

---

## Giai đoạn 4: Mở rộng nhóm & Cải tiến

**Bắt đầu khi:** Phase 3 đạt success metrics.
**Mục tiêu:** Mở rộng lên đủ 50+ người, cải thiện chất lượng output.

### Mở rộng người dùng

- Mở self-register cho thêm người
- Gửi link vào các cộng đồng phù hợp (nhóm indie hacker Việt Nam, cộng đồng tech LinkedIn)
- Monitor: theo dõi job failure rate, thời gian xử lý trung bình

### Cải thiện chất lượng AI

Đây là phần quan trọng nhất giai đoạn 4. Sau khi có đủ feedback:

- A/B test các phiên bản prompt khác nhau để xem cái nào tạo ra nội dung "giống giọng" hơn
- Cân nhắc nâng cấp lên Gemini API trả phí hoặc chuyển sang Claude Sonnet / OpenAI GPT-4o nếu chất lượng output cần cải thiện
- Thêm tính năng: người dùng có thể "like" một bản nháp để hệ thống học giọng văn tốt hơn
- Cân nhắc thêm vector embeddings cho Brand Vault nếu JSON không đủ chi tiết

### Phân quyền user_plan (khi cần)

Khi nào cần làm: khi chi phí API bắt đầu đáng kể, hoặc khi muốn phân biệt trải nghiệm.

Cách implement:
- Đọc `user_plan` từ DB trong middleware hoặc API handler
- Giới hạn theo plan: free = 5 jobs/tháng, pro = unlimited
- Không cần Stripe giai đoạn này — admin nâng plan thủ công qua Supabase dashboard

### Các tính năng SHOULD HAVE (theo thứ tự ưu tiên)

1. **Lịch sử tái chế**: xem lại tất cả jobs đã tạo, search theo keyword
2. **Nhiều Brand Vault**: người dùng có thể lưu nhiều voice profile (cho nhiều sản phẩm/dự án)
3. **Template kênh tùy chỉnh**: người dùng tự định nghĩa format output cho từng kênh
4. **Export**: tải tất cả bản nháp dưới dạng file .txt hoặc .md
5. **Admin panel đơn giản**: xem danh sách users, usage stats, thay đổi user_plan

---

## Tóm tắt Timeline

| Giai đoạn | Thời gian | Kết quả cụ thể |
|-----------|-----------|----------------|
| Phase 0 | ✅ Xong | Tài liệu phân tích, User Flow |
| Phase 1 | 1–2 tuần | Wireframes, Architecture, Data Model, Tech Stack |
| Phase 2 — POC | Nửa ngày | 2 quyết định: URL scraping Pass/Fail, Prompt Stable/Unstable |
| Phase 2 — Build | 4–5 tuần (33 ngày) | Sản phẩm chạy được end-to-end, có error handling và fallback |
| Phase 3 | 1–2 tuần | ≥5 người test, đo được feedback với ngưỡng rõ ràng |
| Phase 4 | Liên tục | 50+ users, cải thiện chất lượng AI |

**Tổng thời gian từ hôm nay đến sản phẩm chạy được:** 6–9 tuần

---

## Phụ lục: Các quyết định còn treo

Những điều này không cần quyết định ngay nhưng cần trả lời trước khi build module liên quan:

1. **Giới hạn độ dài bài đầu vào?** Đề xuất: tối đa 5000 từ. Nếu dài hơn → truncate và thông báo cho user.
2. **Rate limit per user?** Đề xuất: 20 jobs/ngày cho free. Đủ để test, không sợ bị abuse.
3. **Có cần xác minh email sau khi đăng ký không?** Đề xuất: có, Supabase hỗ trợ sẵn.
4. **URL crawling có xử lý được các trang có paywall không?** Không — chỉ crawl public URL, nếu blocked → hướng dẫn user paste text.
5. **Ngôn ngữ UI?** Tiếng Việt hay tiếng Anh? Đề xuất: tiếng Việt cho thân thiện với nhóm mục tiêu.
