'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Facebook, Loader2, RefreshCw, Twitter, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'

interface PublishAttempt {
  id: string
  provider: 'x' | 'facebook'
  target_name: string
  status: 'draft' | 'publishing' | 'published' | 'failed'
  external_post_id?: string
  external_post_url?: string
  error_message?: string
  created_at: string
  drafts: {
    id: string
    channel: string
    content: string
  }
}

interface HistoryResponse {
  attempts: PublishAttempt[]
  total: number
  limit: number
  offset: number
}

const STATUS_CONFIG = {
  draft: { icon: Clock, label: 'Đã copy', color: 'text-app-muted' },
  publishing: { icon: Loader2, label: 'Extension đang đăng', color: 'text-sky-blue' },
  published: { icon: CheckCircle, label: 'Extension đã đăng', color: 'text-forest-fern' },
  failed: { icon: XCircle, label: 'Thất bại', color: 'text-vibrant-orange' },
}

const PROVIDER_CONFIG = {
  x: { icon: Twitter, label: 'X', bgColor: 'bg-midnight-ink' },
  facebook: { icon: Facebook, label: 'Facebook', bgColor: 'bg-sky-blue' },
}

// Channels the Extension can re-post on (mirrors PublishPanel SCHEDULABLE_CHANNELS).
// History rows from other channels (e.g. linkedin) won't show the re-post button.
const REPOSTABLE_CHANNELS = new Set(['x', 'twitter', 'facebook', 'threads', 'instagram', 'facebook-group'])

export function PublishHistory() {
  const [attempts, setAttempts] = useState<PublishAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'x' | 'facebook'>('all')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [repostingId, setRepostingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const pageSize = 20

  const loadHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      })
      if (filter !== 'all') {
        params.set('provider', filter)
      }

      const res = await fetch(`/api/publish/history?${params}`)
      const data: HistoryResponse = await res.json()
      setAttempts(data.attempts)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [filter, page])

  async function handleRepost(draftId: string) {
    setRepostingId(draftId)
    try {
      const res = await fetch(`/api/drafts/${draftId}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Re-post failed')
      }
      setToast({
        type: 'success',
        message: 'Đã xếp lại vào hàng đợi Extension. Extension sẽ đăng lại trong vài giây.',
      })
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Không thể re-post.',
      })
    } finally {
      setRepostingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }

  return (
    <div className="space-y-4">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          isVisible
          onClose={() => setToast(null)}
        />
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-app-line pb-3">
        <Button
          size="sm"
          variant={filter === 'all' ? 'primary' : 'ghost'}
          onClick={() => { setFilter('all'); setPage(0); }}
        >
          Tất cả
        </Button>
        <Button
          size="sm"
          variant={filter === 'x' ? 'primary' : 'ghost'}
          onClick={() => { setFilter('x'); setPage(0); }}
        >
          <Twitter className="h-4 w-4" /> X
        </Button>
        <Button
          size="sm"
          variant={filter === 'facebook' ? 'primary' : 'ghost'}
          onClick={() => { setFilter('facebook'); setPage(0); }}
        >
          <Facebook className="h-4 w-4" /> Facebook
        </Button>
      </div>

      {/* Stats */}
      <p className="text-sm text-app-muted">
        {total} lượt đăng {filter !== 'all' ? `trên ${filter === 'x' ? 'X' : 'Facebook'}` : 'tổng cộng'}
      </p>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-app-muted" />
        </div>
      ) : attempts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-app-muted">Chưa có lượt đăng nào</p>
          <p className="mt-1 text-sm text-app-muted">
            Copy nội dung từ trang Draft hoặc lên lịch qua Extension để xem lịch sử ở đây.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {attempts.map((attempt) => {
            const statusConfig = STATUS_CONFIG[attempt.status]
            const providerConfig = PROVIDER_CONFIG[attempt.provider]
            const StatusIcon = statusConfig.icon
            const ProviderIcon = providerConfig.icon

            return (
              <Card key={attempt.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {/* Provider badge */}
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${providerConfig.bgColor}`}>
                      <ProviderIcon className="h-4 w-4 text-pure-canvas" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-midnight-ink">
                          {attempt.target_name}
                        </span>
                        <span className={`flex items-center gap-1 text-xs ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Content preview */}
                      <p className="mt-1 text-sm text-dark-charcoal">
                        {truncateContent(attempt.drafts?.content || '')}
                      </p>

                      {/* Error message */}
                      {attempt.status === 'failed' && attempt.error_message && (
                        <div className="mt-2 flex items-start gap-2 rounded bg-vibrant-orange/5 p-2 text-xs text-vibrant-orange">
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>{attempt.error_message}</span>
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="mt-2 text-xs text-app-muted">
                        {formatDate(attempt.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {REPOSTABLE_CHANNELS.has(attempt.drafts?.channel) && (
                      <Button
                        size="sm"
                        variant="white"
                        disabled={repostingId !== null}
                        onClick={() => handleRepost(attempt.drafts.id)}
                        title="Đăng lại bài này qua Extension"
                      >
                        {repostingId === attempt.drafts.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Đăng lại
                      </Button>
                    )}
                    {attempt.external_post_url && (
                      <a
                        href={attempt.external_post_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                          Xem
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            size="sm"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span className="text-sm text-app-muted">
            Trang {page + 1} / {Math.ceil(total / pageSize)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={(page + 1) * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  )
}
