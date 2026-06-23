# 03 — Screen Specifications: Layout, Landing, Auth, Onboarding

---

## LAYOUT — App Shell (`components/layout/`)

The app shell wraps all authenticated pages (dashboard, onboarding, review).

### Sidebar (`components/layout/Sidebar.tsx`)

```
width: 260px
height: 100vh
position: fixed left
background: #f8f3eb (warm-sand)
border-right: 1px solid #eae4d9
padding: 32px 16px
display: flex, flex-direction: column
```

**Top section — Logo:**
```
Logo area padding-bottom: 32px, border-bottom: 1px solid #eae4d9
Show: App name "Amplify" in Lora 24px, color #080331
Below name: tagline "AI Content Repurposing" in Inter 12px, color #cccccc
```

**Middle section — Navigation:**
```
margin-top: 32px
flex: 1 (takes remaining space)
display: flex, flex-direction: column, gap: 8px
```

Nav items (in order):
1. Dashboard — Lucide icon `LayoutDashboard`, label "Dashboard / Tổng quan"
2. Brand Vault — Lucide icon `Fingerprint`, label "Brand Vault / Thương hiệu"
3. Tạo nội dung — Lucide icon `Sparkles`, label "Tạo nội dung / Create"
4. Cài đặt — Lucide icon `Settings`, label "Cài đặt / Settings"

Each nav item:
```
display: flex, align-items: center, gap: 12px
padding: 10px 16px
border-radius: 100px (--radius-nav)
font: Inter 500 14px
color: #333333
cursor: pointer
```

Active state:
```
background: rgba(72, 101, 255, 0.08)
color: #4865ff
icon color: #4865ff
```

Hover state (non-active):
```
background: rgba(8, 3, 49, 0.04)
```

**Bottom section — User info:**
```
padding-top: 24px
border-top: 1px solid #eae4d9
display: flex, align-items: center, gap: 12px
```

Avatar circle:
```
width: 40px, height: 40px
border-radius: 100%
background: #4865ff (sky-blue)
color: #ffffff
font: Inter 500 14px
display: flex, align-items: center, justify-content: center
Shows initials from MOCK_USER.avatar_initials
```

User details:
```
Name: Inter 500 14px, color #080331 — from MOCK_USER.full_name
Plan badge: pill badge, background #dce4fb, color #1b1463, text "Free Plan"
```

### AppLayout (`components/layout/AppLayout.tsx`)

```
display: flex
min-height: 100vh
```

Left: `<Sidebar />` (fixed, 260px)
Right: main content area
```
margin-left: 260px
flex: 1
background: #ffffff
min-height: 100vh
padding: 40px 48px
```

### Auth Layout (`app/(auth)/layout.tsx`)

No sidebar. Full page centered layout:
```
min-height: 100vh
background: #ffffff
display: flex
align-items: center
justify-content: center
padding: 40px
```

---

## SCREEN 0 — Landing Page (`app/page.tsx`)

The marketing page at `/`. Users who aren't logged in land here.

### Section 1 — Navigation Bar (sticky top)
```
position: sticky, top: 0
background: rgba(255,255,255,0.9)
backdrop-filter: blur(8px)
border-bottom: 1px solid #eae4d9
padding: 16px 80px
display: flex, align-items: center, justify-content: space-between
z-index: 100
```

Left: "Amplify" logo text (Lora 24px, #080331)

Right: 
- Ghost Button: "Đăng nhập / Sign in" → links to `/login`
- Primary Button: "Bắt đầu miễn phí / Get started free" → links to `/register`
- Buttons gap: 12px

### Section 2 — Hero Section
```
background: linear-gradient(121deg, #cc7ab5 -80.58%, #4865ff 36.36%, #1b1463 102.7%)
padding: 128px 80px
text-align: center
```

Badge above headline:
```
display: inline-flex
background: rgba(255,255,255,0.15)
border: 1px solid rgba(255,255,255,0.3)
border-radius: 1600px
padding: 6px 16px
font: Inter 500 12px
color: #ffffff
text: "✦ AI-Powered · Tiếng Việt · Miễn phí"
margin-bottom: 24px
```

Headline (H1):
```
font: Lora 400 64px
color: #ffffff
line-height: 1
max-width: 800px
margin: 0 auto 24px
text: "Một bài viết.\nĐa kênh.\nGiọng văn vẹn nguyên."
```

Subheadline:
```
font: Inter 400 20px
color: rgba(255,255,255,0.8)
max-width: 560px
margin: 0 auto 40px
text: "Amplify biến một bài blog thành 4 bản nháp cho LinkedIn, Facebook và X — giữ nguyên phong cách viết của bạn, không mất một phút chỉnh sửa prompt."
```

CTA buttons (centered row, gap 16px):
- Primary Button (white variant for dark bg): `background: #ffffff, color: #080331, border-radius: 1600px, padding: 16px 40px` — text "Dùng thử miễn phí / Start free"
- Ghost Button (white outline): `background: transparent, color: #ffffff, border: 1px solid #ffffff, border-radius: 1600px, padding: 16px 24px` — text "Xem demo / Watch demo"

### Section 3 — Pain Points ("Vì sao solo founders bỏ cuộc với marketing?")
```
background: #ffffff
padding: 128px 80px
```

Section label above title:
```
font: Inter 500 12px, color: #4865ff, letter-spacing: 0.1em, text-transform: uppercase
text: "Pain Points"
margin-bottom: 16px
```

Title (H2):
```
font: Lora 400 48px, color: #080331
text: "Vì sao solo founders bỏ cuộc với marketing?"
max-width: 640px, margin-bottom: 64px
```

3-column grid of pain cards (each is Card variant="sand"):
1. Card 1: Icon `Timer` (Lucide), title "17 tab mở cùng lúc", body "Nhảy giữa ChatGPT, LinkedIn, Google Docs, Buffer... kiệt sức chưa kịp đăng bài."
2. Card 2: Icon `Bot` (Lucide), title "Content AI sáo rỗng", body "Dùng AI mà ai cũng nhận ra ngay. Giọng văn của bạn biến mất, thay bằng template vô hồn."
3. Card 3: Icon `CalendarX` (Lucide), title "Marketing bị trì hoãn mãi", body "Cuối tuần mới làm marketing, nhưng cuối tuần lại mệt. Rồi tháng trôi qua không ai biết bạn tồn tại."

Each card:
```
background: #f8f3eb
border-radius: 16px
padding: 32px
Icon: Lucide icon, size 32px, color #4865ff
Title: Lora 24px, color #080331, margin: 16px 0 12px
Body: Inter 400 16px, color #333333, line-height 1.5
```

### Section 4 — How it Works ("Cách Amplify hoạt động")
```
background: #f8f3eb
padding: 128px 80px
```

Title (H2): Lora 400 48px, color #080331, text "3 bước. Không cần kỹ năng marketing."

3-step horizontal flow (or stacked on narrower screens):

Step 1:
```
Number badge: "01" — circular, 48px, background #4865ff, color #ffffff, font Inter 700 16px
Title: Lora 24px "#080331" — "Xây Brand Vault"
Body: Inter 16px #333333 — "Dán URL blog hoặc text bài viết cũ vào. AI phân tích giọng văn, tone, cụm từ đặc trưng — chỉ làm 1 lần."
```

Step 2:
```
Number: "02", same badge style
Title: "Nạp bài gốc"
Body: "Paste bài blog, báo cáo, hoặc script video. Chọn kênh bạn muốn đăng."
```

Step 3:
```
Number: "03", same badge style
Title: "Xem & Copy"
Body: "Nhận 4 bản nháp sẵn sàng đăng cho LinkedIn Post, LinkedIn Thread, Facebook, X — đúng giọng văn của bạn."
```

### Section 5 — Features ("Tính năng nổi bật")
```
background: #ffffff
padding: 128px 80px
```

Title: Lora 400 48px, color #080331, text "Mọi thứ bạn cần, không gì thừa"

2×2 grid of feature cards:

Feature 1 (Card variant="green"):
```
background: #328a3b, color: #ffffff
Icon: Lucide Fingerprint 32px white
Title: Lora 24px white — "Brand Vault"
Body: Inter 16px rgba(255,255,255,0.85) — "Hệ thống nhớ giọng văn vĩnh cửu. Không cần nhắc lại prompt mỗi lần. AI luôn biết bạn là ai."
```

Feature 2 (Card variant="blush"):
```
background: #f098d7, color: #080331
Icon: Lucide Zap 32px #080331
Title: Lora 24px — "Tái chế 1-click"
Body: Inter 16px #333333 — "Một bài → 4 bản nháp song song. LinkedIn, Facebook, X — mỗi kênh đúng format, đúng độ dài, đúng tone."
```

Feature 3 (Card variant="sand"):
```
background: #f8f3eb, color: #080331
Icon: Lucide PenLine 32px #4865ff
Title: Lora 24px — "Review Dashboard"
Body: Inter 16px #333333 — "Chỉnh sửa trực tiếp, tự lưu, 1-click Copy. Regenerate bất kỳ bản nháp nào nếu không ưng."
```

Feature 4 (Card variant="orange"):
```
background: #ff6d39, color: #000000
Icon: Lucide ShieldCheck 32px #000000
Title: Lora 24px — "Giọng văn nhất quán"
Body: Inter 16px rgba(0,0,0,0.75) — "Không còn lo content AI bị nhận ra. Brand Vault đảm bảo mọi bản nháp đều nghe như chính bạn viết."
```

### Section 6 — Social Proof / Stats
```
background: #080331
padding: 80px 80px
text-align: center
```

3 stats in a row:

Stat 1: Number "4×" — Lora 64px #ffffff, label "kênh từ 1 bài viết" — Inter 16px rgba(255,255,255,0.7)
Stat 2: Number "<60s" — Lora 64px #4865ff, label "thời gian tạo 4 bản nháp" — Inter 16px rgba(255,255,255,0.7)
Stat 3: Number "100%" — Lora 64px #ffffff, label "giữ giọng văn của bạn" — Inter 16px rgba(255,255,255,0.7)

### Section 7 — CTA Banner
```
background: linear-gradient(121deg, #cc7ab5 -80.58%, #4865ff 36.36%, #1b1463 102.7%)
padding: 128px 80px
text-align: center
```

Title: Lora 400 48px white — "Bắt đầu ngay hôm nay.\nMiễn phí. Không cần thẻ tín dụng."
Body: Inter 400 20px rgba(255,255,255,0.8) — "Tham gia cùng 50+ solo founders và kỹ sư Việt Nam đang dùng Amplify."
Button (white): `background #ffffff, color #080331, border-radius 1600px, padding 16px 40px, font Inter 600 16px` — "Tạo tài khoản miễn phí / Create free account" → `/register`

### Section 8 — Footer
```
background: #0d5238 (deep-moss)
padding: 64px 80px
color: rgba(255,255,255,0.7)
```

Left: "Amplify" logo text (Lora 24px white) + tagline "Repurpose once. Publish everywhere." (Inter 14px rgba(255,255,255,0.6)) + "© 2026 Amplify. Dự án tốt nghiệp."

Right: Two small link columns:
- Column 1: "Sản phẩm": Dashboard, Brand Vault, Tạo nội dung
- Column 2: "Tài khoản": Đăng nhập, Đăng ký

Links: Inter 14px rgba(255,255,255,0.7), hover: #ffffff

---

## SCREEN 1 — Login (`app/(auth)/login/page.tsx`)

Layout: centered card on white background.

Page title (for SEO): "Đăng nhập — Amplify"

Card:
```
background: #ffffff
border-radius: 16px
padding: 48px
width: 480px
shadow-lg
```

Content inside card (top to bottom):

1. "Amplify" in Lora 32px, color #080331, text-align center
2. Subtitle: Inter 16px #333333, text-align center — "Chào mừng trở lại! / Welcome back!"
3. Divider spacing: 32px
4. Input: label "Email", type email, placeholder "ban@example.com"
5. Input: label "Mật khẩu / Password", type password, placeholder "••••••••"
6. "Quên mật khẩu? / Forgot password?" — link text, Inter 14px #4865ff, text-align right
7. Primary Button full-width: "Đăng nhập / Sign in", type="submit"
8. Divider line with text "hoặc / or" centered
9. Ghost Button full-width: "Đăng ký tài khoản mới / Create account" → `/register`

Note: This is a mock — no actual auth. Clicking "Đăng nhập" should redirect to `/dashboard`.

---

## SCREEN 2 — Register (`app/(auth)/register/page.tsx`)

Same card layout as login.

Page title: "Đăng ký — Amplify"

Content:
1. "Amplify" Lora 32px center
2. Subtitle: "Tạo tài khoản miễn phí / Create your free account"
3. Input: "Họ và tên / Full name", placeholder "Nguyễn Văn A"
4. Input: "Email", type email
5. Input: "Mật khẩu / Password", type password
6. Input: "Xác nhận mật khẩu / Confirm password", type password
7. Tiny text: Inter 12px #333333 — "Bằng cách đăng ký, bạn đồng ý với Điều khoản sử dụng."
8. Primary Button full-width: "Tạo tài khoản / Create account"
9. Ghost Button full-width: "Đã có tài khoản? Đăng nhập / Already have account? Sign in" → `/login`

Note: Clicking "Tạo tài khoản" redirects to `/onboarding`.

---

## SCREEN 3 — Onboarding Step 1 (`app/(app)/onboarding/page.tsx`)

First screen after registration. No sidebar yet — use a clean centered layout similar to auth but wider.

Page title: "Thiết lập Brand Vault — Amplify"

Structure:

**Step indicator at top:**
```
Step 1 of 2 — "Xây Brand Vault"
Progress bar: 50% filled (sky-blue #4865ff line)
```

**Main content (max-width 720px, centered):**

Headline: Lora 48px, #080331 — "Hãy cho AI biết\nbạn viết như thế nào."
Subtext: Inter 16px #333333 — "Brand Vault là bộ nhớ giọng văn vĩnh cửu của bạn. Chỉ cần thiết lập 1 lần."

**Flow selector — 2 cards side by side (gap 24px):**

Card A — "Tôi có bài viết sẵn / I have content":
```
Card variant="default" (white, 16px radius, 32px padding, shadow-md)
Border: 2px solid #4865ff when selected, 1px solid #cccccc when not
Icon: Lucide FileText, 40px, #4865ff
Title: Lora 24px #080331 — "Tôi có bài viết sẵn"
Subtitle: Inter 14px #333333 — "Dán URL blog hoặc text bài viết cũ"
Tag below: small pill tag — "Nhanh nhất · Fastest"
```

Card B — "Tôi chưa có gì / Starting fresh":
```
Same card style
Icon: Lucide MessageSquare, 40px, #ff6d39
Title: Lora 24px — "Tôi chưa có gì"
Subtitle: Inter 14px — "Trả lời 5 câu hỏi nhanh về phong cách viết"
Tag: "Cold Start · 3 phút"
```

Cards are clickable (whole card is clickable, not just a button). Selected state: border 2px solid color.

Below cards, show the selected flow's form:

---

### Flow A — BrandVaultSetupText (`components/onboarding/BrandVaultSetupText.tsx`)

Show only when Flow A is selected.

```
margin-top: 32px
display: flex, flex-direction: column, gap: 16px
```

Toggle between URL and Paste Text:
- Small tabs (Inter 14px): "Dán URL / Paste URL" | "Dán text / Paste text"
- Tab underline style (#4865ff)

When "URL" tab active:
- Input type="url", label "URL bài viết", placeholder "https://yourblog.com/your-post"

When "Text" tab active:
- Textarea, label "Nội dung bài viết", placeholder "Dán 1-3 bài viết của bạn vào đây (tối thiểu 300 từ)...", min-height 200px

Below input, show: Inter 12px #cccccc — "AI sẽ phân tích giọng văn và tạo profile thương hiệu cho bạn."

Primary Button full-width: "Phân tích giọng văn / Analyze voice →"

---

### Flow B — BrandVaultSetupForm (`components/onboarding/BrandVaultSetupForm.tsx`)

Show only when Flow B is selected. A 5-question form:

Q1: Label "Bạn thường viết về chủ đề gì? / What do you write about?"
- Textarea, placeholder "Ví dụ: Product development, startup life, engineering tips..."

Q2: Label "Giọng văn của bạn thiên về? / Your writing tone?"
- Radio group (4 options as styled pill selectors):
  - "Chuyên nghiệp / Professional"
  - "Gần gũi / Friendly"
  - "Hài hước / Humorous"
  - "Trực tiếp / Direct"
- Style: pill shape (1600px radius), unselected: border #cccccc bg #fff, selected: bg #4865ff color #fff

Q3: Label "Đối tượng đọc của bạn là? / Your target audience?"
- Input text, placeholder "Ví dụ: Kỹ sư senior, founder B2B SaaS, PM..."

Q4: Label "Bạn thường dùng văn phong nào? / Writing style?"
- Radio group (4 options, same pill style):
  - "Học thuật / Academic"
  - "Kể chuyện / Storytelling"
  - "Bullet points"
  - "Hỗn hợp / Mixed"

Q5: Label "Paste 1-3 câu mẫu bạn thích (không bắt buộc) / Sample sentences (optional)"
- Textarea, placeholder "Ví dụ: Thực ra là, vấn đề không nằm ở kỹ thuật..."

Primary Button: "Tạo Brand Vault / Create Brand Vault →"

---

### Analyzing Loader (`components/onboarding/AnalyzingLoader.tsx`)

Shown after submitting either flow A or B. Replaces the form.

```
text-align: center
padding: 64px 32px
```

Animated spinner:
```
width: 64px, height: 64px
border: 3px solid #eae4d9
border-top-color: #4865ff
border-radius: 100%
animation: spin 0.8s linear infinite
margin: 0 auto 32px
```

Title: Lora 32px #080331 — "AI đang phân tích giọng văn..."
Subtitle: Inter 16px #333333

Show 3 animated steps appearing sequentially (each fades in after 1s delay):
1. "✓ Đọc nội dung bài viết" (appears at 0.5s)
2. "✓ Phân tích tone và phong cách" (appears at 1.5s)
3. "✓ Xây dựng Brand Vault..." (appears at 2.5s)

Each step: Inter 14px, color #4865ff, with a small checkmark before.

After 4 seconds (mock), automatically navigate to `/onboarding/confirm`.

---

## SCREEN 4 — Onboarding Step 2: Voice Profile Confirm (`app/(app)/onboarding/confirm/page.tsx`)

Step indicator: "Bước 2 / 2 — Xác nhận Brand Vault"
Progress bar: 100% filled.

Headline: Lora 40px — "AI đã hiểu giọng văn của bạn."
Subtext: Inter 16px #333333 — "Xem lại và chỉnh sửa nếu cần. Bạn có thể cập nhật sau."

Show MOCK_BRAND_VAULT.voice_profile as editable sections:

**Section: Tone (giọng điệu)**
Label: Inter 500 14px #333333, text "Tone / Giọng điệu"
Tags: render each `voice_profile.tone` item as `<Tag color="blue" editable onRemove={...} />`
"+ Thêm / Add" button (small ghost, 12px text, small padding)

**Section: Topics (chủ đề)**
Label: "Chủ đề / Topics"
Tags: render `voice_profile.topics` as `<Tag color="green" editable />`
"+ Thêm" button

**Section: Signature phrases (cụm từ đặc trưng)**
Label: "Cụm từ hay dùng / Signature phrases"
Tags: render `voice_profile.signature_phrases` as `<Tag color="pink" editable />`

**Section: Avoid (tránh)**
Label: "Nên tránh / Avoid"
Tags: render `voice_profile.avoid` as `<Tag color="orange" editable />`

**Section: Sentence style**
Label: "Độ dài câu / Sentence style"
Value displayed as text: `voice_profile.sentence_style` — with a dropdown to change
Options: short, medium, long, varied
Style: same ghost dropdown look, border #cccccc, border-radius 100px

---

Below sections, show a preview card:

**System Prompt Preview (collapsible):**
```
Card variant="sand"
Title: Inter 500 14px #080331 — "System Prompt được tạo từ Brand Vault của bạn:"
Body: Inter 400 14px #333333, font-family: monospace
Text (generated from the mock profile):
  "Bạn là trợ lý viết nội dung marketing có phong cách viết cụ thể.
   GIỌNG VĂN: Chuyên nghiệp, Thực tế, Trực tiếp, Không hoa mỹ
   ĐỘ DÀI CÂU: Ngắn (~14 từ/câu)
   CỤM TỪ HAY DÙNG: "Thực ra là", "Nói thẳng ra", "Theo kinh nghiệm của tôi"
   CHỦ ĐỀ: Product development, Engineering, Startup life
   TRÁNH: Hashtag spam, Emoji quá nhiều, Ngôn ngữ sales lộ liễu"
Collapsed by default. Click "Xem System Prompt ↓" to expand.
```

---

**Bottom action row (right-aligned):**
- Ghost Button: "← Chỉnh lại / Edit"
- Primary Button: "Lưu Brand Vault / Save Brand Vault →" → redirects to `/dashboard`

Clicking Save shows a Toast: success, "Brand Vault đã được lưu! / Brand Vault saved!" then redirect.
