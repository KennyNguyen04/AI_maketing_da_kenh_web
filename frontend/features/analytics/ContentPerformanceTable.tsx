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
  draft: { label: 'Nháp', icon: Clock, className: 'text-app-muted bg-app-bg' },
  publishing: { label: 'Đang đăng', icon: Clock, className: 'text-sky-blue bg-sky-blue/10' },
  published: { label: 'Đã đăng', icon: CheckCircle, className: 'text-forest-fern bg-forest-fern/10' },
  failed: { label: 'Thất bại', icon: XCircle, className: 'text-vibrant-orange bg-vibrant-orange/10' },
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
      <div className={cn('rounded-card border border-app-line bg-pure-canvas p-8 text-center', className)}>
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-app-muted/40" />
        <h3 className="mb-1 font-medium text-midnight-ink">Không có dữ liệu</h3>
        <p className="text-sm text-app-muted">
          Chưa có bài đăng nào trong khoảng thời gian này
        </p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-card border border-app-line bg-pure-canvas overflow-hidden', className)}>
      <div className="border-b border-app-line p-4">
        <h3 className="font-semibold text-midnight-ink">Chi tiết bài đăng</h3>
        <p className="mt-0.5 text-sm text-app-muted">
          Danh sách tất cả bài đăng trong khoảng thời gian
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-app-bg/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-app-muted">
                Nội dung
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-app-muted">
                Kênh
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-app-muted">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-app-muted">
                Ngày tạo
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-app-muted">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-line">
            {posts.map((post) => {
              const ChannelIcon = channelIcons[post.drafts?.channel as keyof typeof channelIcons] || Twitter
              const status = statusConfig[post.status] || statusConfig.draft
              const StatusIcon = status.icon

              return (
                <tr key={post.id} className="transition-colors hover:bg-app-bg/30">
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <p className="line-clamp-2 text-sm text-midnight-ink">
                        {post.drafts?.content ? truncateText(post.drafts.content) : 'N/A'}
                      </p>
                      {post.drafts?.repurpose_jobs?.title && (
                        <p className="mt-1 text-xs text-app-muted">
                          Job: {post.drafts.repurpose_jobs.title}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ChannelIcon className={cn(
                        'h-4 w-4',
                        post.drafts?.channel === 'twitter' && 'text-sky-blue',
                        post.drafts?.channel === 'facebook' && 'text-sky-blue',
                        (post.drafts?.channel === 'linkedin_post' || post.drafts?.channel === 'linkedin_thread') && 'text-sky-blue'
                      )} />
                      <span className="text-sm text-midnight-ink">
                        {channelLabels[post.drafts?.channel as keyof typeof channelLabels] || post.provider}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-badge px-2 py-1 text-xs font-medium',
                      status.className
                    )}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                    {post.status === 'failed' && post.error_message && (
                      <p className="mt-1 max-w-xs text-xs text-vibrant-orange" title={post.error_message}>
                        {truncateText(post.error_message, 40)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-app-muted">
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
