import type { Channel, JobStatus } from '@/lib/types'

export const CHANNEL_LIMITS: Record<Channel, number | null> = {
  linkedin_post: 3000,
  linkedin_thread: 3000,
  facebook: 63206,
  twitter: 280,
  x: 280,
  // Threads cap mirrors X — text-first platform, no separate cap yet.
  // Added 2026-07-15 when Threads was promoted to NewJobForm channel.
  threads: 500,
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  linkedin_post: 'LinkedIn Post',
  linkedin_thread: 'LinkedIn Thread',
  facebook: 'Facebook',
  twitter: 'X / Twitter',
  x: 'X / Twitter',
  threads: 'Threads',
}

export const STATUS_LABELS: Record<JobStatus, { vi: string; en: string }> = {
  pending: { vi: 'Chờ xử lý', en: 'Pending' },
  processing: { vi: 'Đang tạo', en: 'Processing' },
  done: { vi: 'Hoàn thành', en: 'Done' },
  failed: { vi: 'Thất bại', en: 'Failed' },
}
