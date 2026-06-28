'use client'

import { cn } from '@/lib/utils'
import { Twitter, Facebook, Linkedin, ExternalLink, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface PostItem {
  id: string
  provider: 'x' | 'facebook'
  target_name: string
  status: 'draft' | 'publishing' | 'published' | 'failed'
  external_post_url?: string
  error_message?: string
  created_at: string
  drafts?: {
    content: string
    channel: string
    repurpose_jobs?: {
      title: string
    }
  }
}

interface ContentPerformanceTableProps {
  posts: PostItem[]
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

const statusConfig = {
  draft: { label: 'Nháp', icon: Clock, className: 'text-gray-600 bg-gray-100' },
  publishing: { label: 'Đang đăng', icon: Clock, className: 'text-blue-600 bg-blue-100' },
  published: { label: 'Đã đăng', icon: CheckCircle, className: 'text-green-600 bg-green-100' },
  failed: { label: 'Thất bại', icon: XCircle, className: 'text-red-600 bg-red-100' },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncateText(text: string, maxLength: number = 80): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function ContentPerformanceTable({ posts, className }: ContentPerformanceTableProps) {
  if (posts.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg border border-light-border p-8 text-center', className)}>
        <AlertCircle className="h-12 w-12 mx-auto text-dark-charcoal/30 mb-3" />
        <h3 className="font-medium text-midnight-ink mb-1">Không có dữ liệu</h3>
        <p className="text-sm text-dark-charcoal/60">
          Chưa có bài đăng nào trong khoảng thời gian này
        </p>
      </div>
    )
  }

  return (
    <div className={cn('bg-white rounded-lg border border-light-border overflow-hidden', className)}>
      <div className="p-4 border-b border-light-border">
        <h3 className="font-semibold text-midnight-ink">Chi tiết bài đăng</h3>
        <p className="text-sm text-dark-charcoal/60 mt-0.5">
          Danh sách tất cả bài đăng trong khoảng thời gian
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-light-surface/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-charcoal/60">
                Nội dung
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-charcoal/60">
                Kênh
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-charcoal/60">
                Trạng thái
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-dark-charcoal/60">
                Ngày tạo
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-dark-charcoal/60">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light-border">
            {posts.map((post) => {
              const ChannelIcon = channelIcons[post.drafts?.channel as keyof typeof channelIcons] || Twitter
              const status = statusConfig[post.status] || statusConfig.draft
              const StatusIcon = status.icon

              return (
                <tr key={post.id} className="hover:bg-light-surface/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <p className="text-sm text-midnight-ink line-clamp-2">
                        {post.drafts?.content ? truncateText(post.drafts.content) : 'N/A'}
                      </p>
                      {post.drafts?.repurpose_jobs?.title && (
                        <p className="text-xs text-dark-charcoal/60 mt-1">
                          Job: {post.drafts.repurpose_jobs.title}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ChannelIcon className={cn(
                        'h-4 w-4',
                        post.drafts?.channel === 'twitter' && 'text-blue-400',
                        post.drafts?.channel === 'facebook' && 'text-blue-600',
                        (post.drafts?.channel === 'linkedin_post' || post.drafts?.channel === 'linkedin_thread') && 'text-sky-600'
                      )} />
                      <span className="text-sm text-midnight-ink">
                        {channelLabels[post.drafts?.channel as keyof typeof channelLabels] || post.provider}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      status.className
                    )}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                    {post.status === 'failed' && post.error_message && (
                      <p className="text-xs text-red-600 mt-1 max-w-xs" title={post.error_message}>
                        {truncateText(post.error_message, 40)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-dark-charcoal/60">
                      {formatDate(post.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {post.status === 'published' && post.external_post_url && (
                      <a
                        href={post.external_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
