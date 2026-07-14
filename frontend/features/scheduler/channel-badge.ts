/**
 * Channel Badge Color Helper — extracted từ SchedulerCalendar.tsx để test được.
 *
 * Channels match `extension_tasks.channel` enum (xem supabase-schema.sql +
 * migrations/005_sync_channel_names.sql):
 *   - 'facebook' | 'facebook-group' | 'threads' | 'instagram' | 'x'
 *   - 'twitter' (legacy alias cho 'x', giữ để render bài viết cũ)
 *   - 'linkedin_post' | 'linkedin_thread' (cho repurpose_jobs drafts)
 *
 * Lưu ý: Tailwind class phải xuất hiện nguyên văn trong source code để JIT
 * compiler detect được. Nếu thêm channel mới, đảm bảo string class tồn tại
 * ở đây (vite sẽ scan toàn bộ file để build CSS).
 */

const CHANNEL_BADGE_COLOR: Record<string, string> = {
  facebook: 'bg-sky-blue',
  'facebook-group': 'bg-indigo-500',
  threads: 'bg-purple-500',
  instagram: 'bg-pink-500',
  x: 'bg-midnight-ink',
  twitter: 'bg-midnight-ink', // legacy alias
  linkedin_post: 'bg-blue-700',
  linkedin_thread: 'bg-blue-500',
}

const DEFAULT_BADGE_COLOR = 'bg-sky-blue'

export function getChannelBadgeColor(channel: string): string {
  return CHANNEL_BADGE_COLOR[channel] ?? DEFAULT_BADGE_COLOR
}

/**
 * Exposed for test introspection — danh sách channel mà SchedulerCalendar hỗ trợ.
 */
export const SUPPORTED_CHANNELS = Object.keys(CHANNEL_BADGE_COLOR)
