'use client'

import { useRouter } from 'next/navigation'
import { Eye, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'

const channelPills: Record<string, string> = {
  linkedin_post: 'LinkedIn',
  linkedin_thread: 'Thread',
  facebook: 'Facebook',
  twitter: 'X',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JobCard({ job }: { job: any }) {
  const router = useRouter()

  const title = job.title || (job.source_type === 'url' ? 'Bài viết từ URL' : 'Nội dung dán')
  const sourceLabel = job.source_type === 'url' ? 'Từ URL' : 'Từ text'

  return (
    <div className="grid gap-3 px-4 py-4 transition hover:bg-app-bg md:grid-cols-[minmax(220px,2fr)_1fr_120px_130px_100px] md:items-center">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-midnight-ink">{title}</h3>
        <p className="mt-1 text-xs text-app-muted">{sourceLabel}</p>
      </div>
      <div>
        <p className="text-sm text-dark-charcoal">{job.channels?.length || 0} kênh</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {job.channels?.map((channel: string, index: number) => (
            <span key={`${channel}-${index}`} className="rounded-badge border border-hint-of-blue bg-hint-of-blue/50 px-2 py-0.5 text-[11px] text-regal-violet">
              {channelPills[channel] || channel}
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm text-dark-charcoal">{formatDate(job.created_at)}</p>
      <StatusBadge status={job.status} />
      <div className="flex justify-start md:justify-end">
        {job.status === 'done' ? (
          <Button variant="ghost" size="sm" onClick={() => router.push(`/review/${job.id}`)}>
            <Eye className="h-4 w-4" /> Xem
          </Button>
        ) : null}
        {job.status === 'failed' ? (
          <Button variant="danger" size="sm" onClick={() => router.push(`/review/${job.id}`)}>
            <RotateCcw className="h-4 w-4" /> Xử lý
          </Button>
        ) : null}
        {job.status === 'processing' ? <span className="text-xs font-medium text-sky-blue">Đang xử lý</span> : null}
        {job.status === 'pending' ? <span className="text-xs text-app-muted">Đang chờ</span> : null}
      </div>
    </div>
  )
}
