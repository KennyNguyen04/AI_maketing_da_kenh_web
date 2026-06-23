# 01 — Mock Data Specification

## File: `lib/mock-data.ts`

Create this file with ALL of the following content exactly:

```typescript
// ─── Types ───────────────────────────────────────────────────────────────────

export type UserPlan = 'free' | 'pro' | 'admin'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'
export type SourceType = 'url' | 'text' | 'form'
export type Channel = 'linkedin_post' | 'linkedin_thread' | 'facebook' | 'twitter'

export interface MockUser {
  id: string
  email: string
  full_name: string
  user_plan: UserPlan
  avatar_initials: string
  created_at: string
}

export interface VoiceProfile {
  tone: string[]
  sentence_style: 'short' | 'medium' | 'long' | 'varied'
  avg_sentence_length: number
  signature_phrases: string[]
  topics: string[]
  avoid: string[]
}

export interface MockBrandVault {
  id: string
  user_id: string
  name: string
  voice_profile: VoiceProfile
  source_type: SourceType
  raw_input: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MockJob {
  id: string
  user_id: string
  brand_vault_id: string
  title: string
  source_type: SourceType
  source_content: string
  channels: Channel[]
  status: JobStatus
  error_message?: string
  created_at: string
}

export interface MockDraft {
  id: string
  job_id: string
  user_id: string
  channel: Channel
  content: string
  is_edited: boolean
  is_done: boolean
  is_current: boolean
  version: number
  created_at: string
  updated_at: string
}

// ─── Mock User ────────────────────────────────────────────────────────────────

export const MOCK_USER: MockUser = {
  id: 'user-001',
  email: 'tuan.nguyen@amplify.vn',
  full_name: 'Nguyễn Minh Tuấn',
  user_plan: 'free',
  avatar_initials: 'NT',
  created_at: '2026-05-01T09:00:00Z',
}

// ─── Mock Brand Vault ─────────────────────────────────────────────────────────

export const MOCK_BRAND_VAULT: MockBrandVault = {
  id: 'bv-001',
  user_id: 'user-001',
  name: 'Giọng văn chính',
  voice_profile: {
    tone: ['Chuyên nghiệp', 'Thực tế', 'Trực tiếp', 'Không hoa mỹ'],
    sentence_style: 'short',
    avg_sentence_length: 14,
    signature_phrases: ['Thực ra là', 'Nói thẳng ra', 'Điều quan trọng hơn là', 'Theo kinh nghiệm của tôi'],
    topics: ['Product development', 'Engineering', 'Startup life', 'Productivity'],
    avoid: ['Hashtag spam', 'Emoji quá nhiều', 'Ngôn ngữ sales lộ liễu', 'Jargon học thuật'],
  },
  source_type: 'text',
  raw_input: 'Tôi đã dành 3 năm xây dựng sản phẩm mà không ai dùng...',
  is_active: true,
  created_at: '2026-05-02T10:30:00Z',
  updated_at: '2026-05-10T14:00:00Z',
}

// ─── Mock Jobs ────────────────────────────────────────────────────────────────

export const MOCK_JOBS: MockJob[] = [
  {
    id: 'job-001',
    user_id: 'user-001',
    brand_vault_id: 'bv-001',
    title: 'Bài học từ 6 tháng đầu làm solo founder',
    source_type: 'text',
    source_content: `Sau 6 tháng tự mình gánh mọi thứ từ code đến marketing, tôi rút ra 3 bài học đắt giá...

Thứ nhất: Marketing không thể để cuối tuần. Tôi đã làm vậy và hậu quả là tăng trưởng bị chậm lại rõ rệt vào tháng thứ 3.

Thứ hai: Giọng văn nhất quán quan trọng hơn tần suất. Tôi từng post mỗi ngày nhưng content chất lượng thấp, về sau post 3 lần/tuần nhưng có chiều sâu — engagement tăng 40%.

Thứ ba: Tái chế nội dung thông minh. Một bài blog tốt có thể thành 5-7 post mạng xã hội nếu biết cách phân tách.`,
    channels: ['linkedin_post', 'linkedin_thread', 'facebook', 'twitter'],
    status: 'done',
    created_at: '2026-05-14T08:00:00Z',
  },
  {
    id: 'job-002',
    user_id: 'user-001',
    brand_vault_id: 'bv-001',
    title: 'Tại sao tôi chọn build in public',
    source_type: 'text',
    source_content: 'Build in public không chỉ là xu hướng — đó là chiến lược marketing bền vững nhất tôi từng thử...',
    channels: ['linkedin_post', 'twitter'],
    status: 'done',
    created_at: '2026-05-11T10:00:00Z',
  },
  {
    id: 'job-003',
    user_id: 'user-001',
    brand_vault_id: 'bv-001',
    title: 'Review tool AI tôi dùng mỗi ngày',
    source_type: 'url',
    source_content: 'https://myblog.com/ai-tools-review-2026',
    channels: ['linkedin_post', 'facebook'],
    status: 'processing',
    created_at: '2026-05-16T07:30:00Z',
  },
  {
    id: 'job-004',
    user_id: 'user-001',
    brand_vault_id: 'bv-001',
    title: 'Sai lầm khi validate idea sản phẩm',
    source_type: 'text',
    source_content: 'Tôi đã dành 2 tháng build tính năng mà không ai cần...',
    channels: ['linkedin_post', 'twitter'],
    status: 'failed',
    error_message: 'AI service timeout sau 3 lần thử lại. Vui lòng thử lại.',
    created_at: '2026-05-10T16:00:00Z',
  },
]

// ─── Mock Drafts (for job-001) ────────────────────────────────────────────────

export const MOCK_DRAFTS: MockDraft[] = [
  {
    id: 'draft-001',
    job_id: 'job-001',
    user_id: 'user-001',
    channel: 'linkedin_post',
    content: `6 tháng làm solo founder dạy tôi điều này:

Marketing không thể để cuối tuần.

Tôi đã trả giá đắt cho bài học đó. Tháng thứ 3, tăng trưởng chậm rõ rệt — không phải vì sản phẩm tệ, mà vì tôi không có mặt ở đâu cả.

Bài học thực tế:

→ Giọng văn nhất quán quan trọng hơn tần suất
→ 3 bài/tuần có chiều sâu > 7 bài/tuần nông cạn
→ 1 bài blog tốt = 5-7 post mạng xã hội nếu biết tái chế

Điều quan trọng hơn là: đừng chờ hoàn hảo. Bắt đầu với 30 phút/ngày.

Bạn đang ở đâu trong hành trình solo founder? Chia sẻ phía dưới 👇`,
    is_edited: false,
    is_done: false,
    is_current: true,
    version: 1,
    created_at: '2026-05-14T08:05:00Z',
    updated_at: '2026-05-14T08:05:00Z',
  },
  {
    id: 'draft-002',
    job_id: 'job-001',
    user_id: 'user-001',
    channel: 'linkedin_thread',
    content: `Tôi vừa trải qua 6 tháng làm solo founder. Đây là 3 bài học đắt nhất:

---

Bài 1: Marketing không thể để cuối tuần

Tháng đầu tôi nghĩ: "Code xong rồi mới marketing". Sai hoàn toàn. Đến tuần thứ 8, không ai biết sản phẩm của tôi tồn tại.

---

Bài 2: Nhất quán > Tần suất

Tôi từng post mỗi ngày — content nông, engagement thấp. Chuyển sang 3 lần/tuần, viết có chiều sâu: engagement tăng 40% trong 1 tháng.

---

Bài 3: Tái chế nội dung thông minh

Một bài blog = 5-7 posts nếu biết cách phân tách. Thực ra là đây là đòn bẩy content mạnh nhất tôi tìm ra.

---

Takeaway: Bắt đầu marketing từ ngày 1, không phải ngày 100.

Bạn đang xây gì? Tôi đọc hết comment.`,
    is_edited: false,
    is_done: false,
    is_current: true,
    version: 1,
    created_at: '2026-05-14T08:05:00Z',
    updated_at: '2026-05-14T08:05:00Z',
  },
  {
    id: 'draft-003',
    job_id: 'job-001',
    user_id: 'user-001',
    channel: 'facebook',
    content: `Mình vừa qua 6 tháng đầu làm một mình — không đồng đội, không budget marketing, chỉ có laptop và cà phê ☕

솔직히 nói: khó hơn mình nghĩ rất nhiều.

Nhưng 3 tháng gần đây bắt đầu có chút tín hiệu tốt. Và nhìn lại, mình thấy sự khác biệt nằm ở 3 thứ:

1️⃣ Thôi không để marketing cuối tuần. Marketing cần được làm mỗi ngày, dù chỉ 30 phút.

2️⃣ Ít post hơn nhưng có chiều sâu hơn. 3 bài/tuần đàng hoàng tốt hơn 7 bài qua loa.

3️⃣ Học cách tái chế nội dung. Một bài viết hay có thể đẻ ra rất nhiều content cho mạng xã hội — chỉ cần biết cách cắt và đóng gói lại.

Có ai đang trên hành trình tương tự không? Mình muốn nghe câu chuyện của bạn 🙌`,
    is_edited: true,
    is_done: false,
    is_current: true,
    version: 1,
    created_at: '2026-05-14T08:05:00Z',
    updated_at: '2026-05-14T09:20:00Z',
  },
  {
    id: 'draft-004',
    job_id: 'job-001',
    user_id: 'user-001',
    channel: 'twitter',
    content: `6 tháng solo founder. 3 bài học thực tế:

→ Marketing không thể để cuối tuần
→ 3 post/tuần có chiều sâu > 7 post nông cạn
→ 1 bài blog tốt = 5-7 social posts

Điều quan trọng hơn là: bắt đầu từ ngày 1, không phải ngày 100.`,
    is_edited: false,
    is_done: true,
    is_current: true,
    version: 1,
    created_at: '2026-05-14T08:05:00Z',
    updated_at: '2026-05-14T08:05:00Z',
  },
]

// ─── Character limits per channel ────────────────────────────────────────────

export const CHANNEL_LIMITS: Record<Channel, number | null> = {
  linkedin_post: 3000,
  linkedin_thread: 3000,
  facebook: 63206,
  twitter: 280,
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  linkedin_post: 'LinkedIn Post',
  linkedin_thread: 'LinkedIn Thread',
  facebook: 'Facebook',
  twitter: 'X / Twitter',
}

export const CHANNEL_ICONS: Record<Channel, string> = {
  linkedin_post: 'linkedin',
  linkedin_thread: 'linkedin',
  facebook: 'facebook',
  twitter: 'twitter',
}

// ─── Status labels ────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<JobStatus, { vi: string; en: string }> = {
  pending: { vi: 'Chờ xử lý', en: 'Pending' },
  processing: { vi: 'Đang tạo', en: 'Processing' },
  done: { vi: 'Hoàn thành', en: 'Done' },
  failed: { vi: 'Thất bại', en: 'Failed' },
}
```
