'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Clock, X, Edit, Twitter, Facebook, Linkedin, AlertCircle, CheckCircle } from 'lucide-react'

interface QueueItem {
  id: string
  channel: string
  content: string
  scheduled_for: string
  job_title?: string
}

interface QueueListProps {
  items: QueueItem[]
  onCancel?: (id: string) => Promise<void>
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
  twitter: 'bg-blue-400 text-white',
  facebook: 'bg-blue-600 text-white',
  linkedin_post: 'bg-sky-600 text-white',
  linkedin_thread: 'bg-sky-700 text-white',
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

export function QueueList({ items, onCancel, onEdit, className }: QueueListProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const handleCancel = async (id: string) => {
    if (!onCancel) return

    setCancellingId(id)
    try {
      await onCancel(id)
    } finally {
      setCancellingId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg border border-light-border p-8 text-center', className)}>
        <Clock className="h-12 w-12 mx-auto text-dark-charcoal/30 mb-3" />
        <h3 className="font-medium text-midnight-ink mb-1">Không có bài đăng nào được lên lịch</h3>
        <p className="text-sm text-dark-charcoal/60">
          Chọn một bản nháp và đặt lịch đăng bài
        </p>
      </div>
    )
  }

  return (
    <div className={cn('bg-white rounded-lg border border-light-border', className)}>
      <div className="p-4 border-b border-light-border">
        <h3 className="font-semibold text-midnight-ink">
          Bài đăng đã lên lịch ({items.length})
        </h3>
        <p className="text-sm text-dark-charcoal/60 mt-0.5">
          Quản lý và chỉnh sửa các bài đăng đã lên lịch
        </p>
      </div>

      <div className="divide-y divide-light-border">
        {items.map((item) => {
          const { date, time, isPast } = formatScheduledTime(item.scheduled_for)
          const ChannelIcon = channelIcons[item.channel as keyof typeof channelIcons] || Twitter

          return (
            <div
              key={item.id}
              className={cn(
                'p-4 transition-colors',
                isPast && 'bg-red-50/50'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2 rounded-lg shrink-0',
                  channelColors[item.channel as keyof typeof channelColors] || 'bg-gray-400 text-white'
                )}>
                  <ChannelIcon className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-midnight-ink">
                      {channelLabels[item.channel as keyof typeof channelLabels] || item.channel}
                    </span>
                    {isPast && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        <AlertCircle className="h-3 w-3" />
                        Quá hạn
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-dark-charcoal line-clamp-2 mb-2">
                    {item.content}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-dark-charcoal/60">
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

                <div className="flex items-center gap-2 shrink-0">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="p-2 text-dark-charcoal/40 hover:text-midnight-ink hover:bg-light-surface rounded-md transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  {onCancel && (
                    <button
                      onClick={() => handleCancel(item.id)}
                      disabled={cancellingId === item.id}
                      className="p-2 text-dark-charcoal/40 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      title="Hủy lịch"
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
