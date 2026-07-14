/**
 * Extension Helpers — pure functions extracted từ background.js & popup.js
 * để có thể unit test mà không cần Chrome API mocks.
 *
 * Extension không chạy được trong Node test runner ngay (do top-level await +
 * chrome.* globals), nhưng các pure logic functions bên trong thì có thể.
 * Test runner: node --test (Vitest cũng work).
 */

// ─── 1. Retry policy ────────────────────────────────────────────────

/**
 * Quyết định có nên retry một failed task hay không.
 * Dùng đồng bộ giữa background.js (exponential backoff) và tests.
 *
 * @param retryCount - số lần đã retry trước đó
 * @param maxRetries - tối đa cho phép (mặc định 2 — match code cũ)
 */
export function shouldRetryTask(retryCount, maxRetries = 2) {
  return typeof retryCount === 'number' && retryCount < maxRetries
}

/**
 * Tính delay (ms) cho exponential backoff giữa các retry.
 * retry 1 → 2s, retry 2 → 4s, retry 3 → 8s, ...
 */
export function calculateRetryDelay(retryCount, baseMs = 2000) {
  return Math.pow(2, retryCount) * baseMs
}

// ─── 2. Processing state shape ──────────────────────────────────────

/**
 * Build shape cho cả PROCESSING_KEY và currentProcessingPost từ task + tabId.
 * Đảm bảo 2 key luôn đồng bộ (P0-3: set PROCESSING_KEY đồng thời currentProcessingPost).
 *
 * Trả về object với 2 keys:
 *   - processingState: state cho SW (background/popup)
 *   - automatorPayload: payload cho content scripts (fb-personal.js, etc.)
 */
export function buildProcessingState(task, tabId, runInBackground) {
  return {
    processingState: {
      id: task.id,
      channel: task.channel,
      tabId,
      retryCount: 0,
      stage: 'Đang mở trang đăng…',
      background: !!runInBackground,
      startedAt: Date.now(),
    },
    automatorPayload: {
      id: task.id,
      content: task.content,
      channel: task.channel,
      target_id: task.target_id,
      target_type: task.target_type,
      images: task.images || [],
    },
  }
}

// ─── 3. Channel display names ───────────────────────────────────────

const CHANNEL_DISPLAY_NAMES = {
  facebook: 'Facebook',
  'facebook-group': 'Facebook Group',
  threads: 'Threads',
  instagram: 'Instagram',
  x: 'X (Twitter)',
  twitter: 'X (Twitter)', // legacy alias
  linkedin_post: 'LinkedIn Post',
  linkedin_thread: 'LinkedIn Thread',
}

/**
 * Trả về tên hiển thị thân thiện cho channel. Dùng trong popup + banner.
 */
export function getChannelDisplayName(channel) {
  return CHANNEL_DISPLAY_NAMES[channel] || channel
}

// ─── 4. Platform URL mapper ─────────────────────────────────────────

const PLATFORM_URLS = {
  facebook: 'https://www.facebook.com/',
  'facebook-group': (task) => `https://www.facebook.com/groups/${task.target_id}`,
  threads: 'https://www.threads.net',
  instagram: 'https://www.instagram.com',
  x: 'https://x.com/compose/post',
  twitter: 'https://x.com/compose/post', // legacy alias
}

const DEFAULT_URL = 'https://www.facebook.com/'

/**
 * Resolve URL extension sẽ mở cho một task. Pure function — test được.
 * Trả về DEFAULT_URL nếu channel không match.
 */
export function getPlatformUrl(task) {
  const entry = PLATFORM_URLS[task.channel]
  if (typeof entry === 'function') return entry(task)
  return entry || DEFAULT_URL
}

// ─── 5. Stale task detection ────────────────────────────────────────

/**
 * Kiểm tra một task có bị stuck (worker chết giữa chừng) hay không.
 * Dùng trong resync logic ở /api/extension/resync (P0 recovery).
 *
 * @param task - { status: 'processing', updated_at: ISO string }
 * @param now  - timestamp hiện tại (ms), default Date.now() — pass để test deterministic
 * @param thresholdMs - ngưỡng stale (default 5 phút, khớp với resync endpoint)
 */
export function isStaleProcessingTask(task, now = Date.now(), thresholdMs = 5 * 60 * 1000) {
  if (!task || task.status !== 'processing') return false
  if (!task.updated_at) return true // processing nhưng không có updated_at → chắc chắn stale
  const age = now - new Date(task.updated_at).getTime()
  return age >= thresholdMs
}

// ─── 6. Rate-limit filter cho poll candidates ───────────────────────

/**
 * Quyết định task có thể pick up ngay hay cần đợi scheduled_for.
 * Mirrors logic trong extension/background.js `pollAndProcessTask()`:
 *   - priority >= 100 → urgent, bypass scheduled_for
 *   - scheduled_for missing hoặc <= now → ready
 *   - ngược lại → đợi
 */
export function isTaskReadyNow(task, now = Date.now()) {
  if (!task) return false
  const isUrgent = (task.priority || 0) >= 100
  if (isUrgent) return true
  if (!task.scheduled_for) return true
  return new Date(task.scheduled_for).getTime() <= now
}

// ─── 7. URL helpers ─────────────────────────────────────────────────

/**
 * Kiểm tra URL có phải của platform được support hay không.
 * Mirror logic trong background.js tab.onUpdated injection guard.
 */
export function isSupportedPlatformUrl(url) {
  if (typeof url !== 'string') return false
  return [
    'facebook.com',
    'threads.net',
    'instagram.com',
    'x.com',
    'twitter.com',
  ].some(host => url.includes(host))
}
