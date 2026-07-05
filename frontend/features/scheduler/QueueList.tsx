'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Clock, X, Edit, Twitter, Facebook, Linkedin, AlertCircle } from 'lucide-react'

interface QueueItem {
  id: string
  channel: string
  content: string
  scheduled_for: string
  job_title?: string
}

interface QueueListProps {
  items: QueueItem[]
  /** Triggered when user clicks Cancel — caller is responsible for showing a confirmation dialog */
  onCancelRequest?: (id: string) => void
  onEdit?: (item: QueueItem) => void
  className?: string
}

const channelIcons = {
  twitter: Twitter,
  facebook: Facebook,
  linkedin_post: Linkedin,
  linkedin_thread: Linkedin,
}

const channelLabels = {
  twitter: 'X (Twitter)',
  facebook: 'Facebook',
  linkedin_post: 'LinkedIn Post',
  linkedin_thread: 'LinkedIn Thread',
}

const channelColors = {
  twitter: 'bg-sky-blue text-pure-canvas',
  facebook: 'bg-sky-blue text-pure-canvas',
  linkedin_post: 'bg-sky-blue text-pure-canvas',
  linkedin_thread: 'bg-sky-blue text-pure-canvas',
}

function formatScheduledTime(dateString: string): { date: string; time: string; isPast: boolean } {
  const date = new Date(dateString)
  const now = new Date()
  const isPast = date <= now

  const timeStr = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString()

  let dateStr: string
  if (isToday) {
    dateStr = 'Hôm nay'
  } else if (isTomorrow) {
    dateStr = 'Ngày mai'
  } else {
    dateStr = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    })
  }

  return { date: dateStr, time: timeStr, isPast }
}

export function QueueList({ items, onCancelRequest, onEdit, className }: QueueListProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // setCancellingId is exposed for callers that want to track in-flight cancellations; kept for API parity.
  void setCancellingId
  const handleCancel = (id: string) => {
    if (!onCancelRequest) return
    onCancelRequest(id)
    setCancellingId(id)
  }

  if (items.length === 0) {
    return (
      <div className={cn('rounded-card border border-app-line bg-pure-canvas p-8 text-center', className)}>
        <Clock className="mx-auto mb-3 h-12 w-12 text-app-muted/40" />
        <h3 className="mb-1 font-medium text-midnight-ink">Không có bài đăng nào được lên lịch</h3>
        <p className="text-sm text-app-muted">
          Chọn một bản nháp và đặt lịch đăng bài
        </p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-card border border-app-line bg-pure-canvas', className)}>
      <div className="border-b border-app-line p-4">
        <h3 className="font-semibold text-midnight-ink">
          Bài đăng đã lên lịch ({items.length})
        </h3>
        <p className="mt-0.5 text-sm text-app-muted">
          Quản lý và chỉnh sửa các bài đăng đã lên lịch
        </p>
      </div>

      <div className="divide-y divide-app-line">
        {items.map((item) => {
          const { date, time, isPast } = formatScheduledTime(item.scheduled_for)
          const ChannelIcon = channelIcons[item.channel as keyof typeof channelIcons] || Twitter

          return (
            <div
              key={item.id}
              className={cn(
                'p-4 transition-colors',
                isPast && 'bg-vibrant-orange/5'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'shrink-0 rounded-nav p-2',
                  channelColors[item.channel as keyof typeof channelColors] || 'bg-midnight-ink text-pure-canvas'
                )}>
                  <ChannelIcon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-midnight-ink">
                      {channelLabels[item.channel as keyof typeof channelLabels] || item.channel}
                    </span>
                    {isPast && (
                      <span className="inline-flex items-center gap-1 rounded-badge bg-vibrant-orange/10 px-2 py-0.5 text-xs text-vibrant-orange">
                        <AlertCircle className="h-3 w-3" />
                        Quá hạn
                      </span>
                    )}
                  </div>

                  <p className="mb-2 line-clamp-2 text-sm text-dark-charcoal">
                    {item.content}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-app-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {date}, {time}
                    </span>
                    {item.job_title && (
                      <span className="truncate">
                        Job: {item.job_title}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="rounded-nav p-2 text-app-muted transition-colors hover:bg-app-bg hover:text-midnight-ink"
                      title="Chỉnh sửa"
                      aria-label="Chỉnh sửa bài đăng"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  {onCancelRequest && (
                    <button
                      onClick={() => handleCancel(item.id)}
                      disabled={cancellingId === item.id}
                      className="rounded-nav p-2 text-app-muted transition-colors hover:bg-vibrant-orange/10 hover:text-vibrant-orange disabled:opacity-50"
                      title="Hủy lịch"
                      aria-label="Hủy lịch đăng"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
