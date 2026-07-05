'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Facebook, Loader2, Send, Twitter, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TimeSlotPicker } from '@/features/scheduler'
import type { SocialAccount } from '@/lib/types'

interface DraftForPublish {
  id: string
  channel: string
  content: string
}

type BusyState = 'x' | 'facebook' | 'linkedin' | 'threads' | 'instagram' | 'schedule' | null

// Map draft.channel → platform theo ngôn ngữ người dùng.
const CHANNEL_LABELS: Record<string, { label: string; url: string; copyHint: string }> = {
  x: {
    label: 'X (Twitter)',
    url: 'https://x.com/compose/post',
    copyHint: 'Đã sao chép nội dung và mở X. Hãy dán, chỉnh sửa rồi tự bấm đăng.',
  },
  twitter: {
    label: 'X (Twitter)',
    url: 'https://x.com/compose/post',
    copyHint: 'Đã sao chép nội dung và mở X. Hãy dán, chỉnh sửa rồi tự bấm đăng.',
  },
  facebook: {
    label: 'Facebook',
    url: 'https://www.facebook.com/',
    copyHint: 'Đã sao chép nội dung và mở Facebook. Hãy dán, chỉnh sửa rồi tự bấm đăng.',
  },
  'facebook-group': {
    label: 'Facebook Group',
    url: 'https://www.facebook.com/groups/',
    copyHint: 'Đã sao chép nội dung. Mở group của bạn, dán nội dung và tự bấm đăng.',
  },
  threads: {
    label: 'Threads',
    url: 'https://www.threads.net/',
    copyHint: 'Đã sao chép nội dung và mở Threads. Hãy dán, chỉnh sửa rồi tự bấm đăng.',
  },
  instagram: {
    label: 'Instagram',
    url: 'https://www.instagram.com/',
    copyHint: 'Đã sao chép nội dung và mở Instagram. Hãy dán, chỉnh sửa rồi tự bấm đăng.',
  },
  linkedin: {
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/feed/?shareActive=true',
    copyHint: 'Đã sao chép nội dung và mở LinkedIn. Hãy dán, chỉnh sửa rồi tự bấm đăng.',
  },
}

// Channels hỗ trợ lên lịch qua Extension (browser automation).
const SCHEDULABLE_CHANNELS = new Set(['x', 'twitter', 'facebook', 'threads', 'instagram', 'facebook-group'])

export function PublishPanel({ draft, content }: { draft: DraftForPublish; content: string }) {
  const [accounts] = useState<SocialAccount[]>([])
  const [loadingAccounts] = useState(false)
  const [busy, setBusy] = useState<BusyState>(null)
  const [message, setMessage] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [openDialog, setOpenDialog] = useState<'x' | 'facebook' | 'threads' | 'instagram' | 'linkedin' | null>(null)

  const channelInfo = CHANNEL_LABELS[draft.channel] ?? CHANNEL_LABELS.x
  const canSchedule = SCHEDULABLE_CHANNELS.has(draft.channel)
  const overXLimit = content.length > 280 && (draft.channel === 'x' || draft.channel === 'twitter')

  useEffect(() => {
    // Accounts list no longer drives UI — kept for future use, but skip fetch to
    // avoid showing OAuth-connection prompts that imply webapp-side publishing.
  }, [])

  async function copyAndOpen(key: 'x' | 'facebook' | 'threads' | 'instagram' | 'linkedin') {
    setBusy(key)
    setMessage('')
    try {
      await navigator.clipboard.writeText(content)
      const url = CHANNEL_LABELS[key]?.url ?? channelInfo.url
      window.open(url, '_blank', 'noopener,noreferrer')
      setMessage(CHANNEL_LABELS[key]?.copyHint ?? channelInfo.copyHint)
      setOpenDialog(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể sao chép nội dung.')
    } finally {
      setBusy(null)
    }
  }

  async function handleSchedule(draftId: string, scheduledFor: Date) {
    setBusy('schedule')
    setMessage('')
    try {
      const res = await fetch(`/api/schedule/${draftId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor: scheduledFor.toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule')
      }
      setMessage(
        `Đã lên lịch đăng bài vào ${scheduledFor.toLocaleString('vi-VN')}. Extension sẽ tự động đăng khi đến giờ (cần mở Extension và đăng nhập social trên trình duyệt).`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-medium text-midnight-ink">Phân phối nội dung</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-app-muted">
            Amplify không tự đăng lên mạng xã hội. Bạn có thể <strong>Copy + Open</strong> để dán thủ công, hoặc <strong>Lên lịch</strong> để Extension tự động đăng qua trình duyệt của bạn.
          </p>
          {message ? (
            <p className="mt-3 text-xs font-medium text-vibrant-orange">{message}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" disabled={busy !== null} onClick={() => setOpenDialog('x')}>
            <Twitter className="h-4 w-4" /> Copy + Open X
          </Button>
          <Button size="sm" variant="primary" disabled={busy !== null} onClick={() => setOpenDialog('facebook')}>
            <Facebook className="h-4 w-4" /> Copy + Open Facebook
          </Button>
          <Button size="sm" variant="primary" disabled={busy !== null} onClick={() => setOpenDialog('linkedin')}>
            <ExternalLink className="h-4 w-4" /> Copy + Open LinkedIn
          </Button>
          {canSchedule && (
            <Button size="sm" variant="white" disabled={busy !== null} onClick={() => setShowScheduleModal(true)}>
              {busy === 'schedule' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Lên lịch qua Extension
            </Button>
          )}
        </div>
      </div>

      {overXLimit ? (
        <p className="text-xs text-vibrant-orange">
          Bản nháp dài hơn 280 ký tự. Hãy rút gọn trước khi copy sang X.
        </p>
      ) : null}

      {/* X dialog */}
      {openDialog === 'x' ? (
        <DialogShell title="Copy + Open X" subtitle="Sao chép nội dung rồi mở X để bạn tự dán và đăng." content={content} contentLength={content.length} maxLength={280} onClose={() => setOpenDialog(null)}>
          <Button variant="ghost" onClick={() => setOpenDialog(null)}>Hủy</Button>
          <Button onClick={() => copyAndOpen('x')} disabled={busy !== null}>
            {busy === 'x' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Copy + Open X
          </Button>
        </DialogShell>
      ) : null}

      {/* Facebook dialog */}
      {openDialog === 'facebook' ? (
        <DialogShell title="Copy + Open Facebook" subtitle="Sao chép nội dung rồi mở Facebook để bạn tự dán và đăng." content={content} contentLength={content.length} maxLength={null} onClose={() => setOpenDialog(null)}>
          <Button variant="ghost" onClick={() => setOpenDialog(null)}>Hủy</Button>
          <Button onClick={() => copyAndOpen('facebook')} disabled={busy !== null}>
            {busy === 'facebook' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Copy + Open Facebook
          </Button>
        </DialogShell>
      ) : null}

      {/* LinkedIn dialog */}
      {openDialog === 'linkedin' ? (
        <DialogShell title="Copy + Open LinkedIn" subtitle="LinkedIn không có compose URL prefill text. Amplify sẽ copy nội dung rồi mở LinkedIn." content={content} contentLength={content.length} maxLength={null} onClose={() => setOpenDialog(null)}>
          <Button variant="ghost" onClick={() => setOpenDialog(null)}>Hủy</Button>
          <Button onClick={() => copyAndOpen('linkedin')} disabled={busy !== null}>
            {busy === 'linkedin' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Copy + Open LinkedIn
          </Button>
        </DialogShell>
      ) : null}

      {/* Schedule modal */}
      <TimeSlotPicker
        isOpen={showScheduleModal}
        draftId={draft.id}
        channel={draft.channel}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
      />
    </Card>
  )
}

function DialogShell({
  title,
  subtitle,
  content,
  contentLength,
  maxLength,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  content: string
  contentLength: number
  maxLength: number | null
  onClose: () => void
  children: React.ReactNode
}) {
  const overLimit = maxLength !== null && contentLength > maxLength
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-black/40 p-4">
      <div className="w-full max-w-[680px] rounded-card border border-app-line bg-pure-canvas p-6 shadow-lg">
        <h2 className="text-xl text-midnight-ink">{title}</h2>
        <p className="mt-2 text-sm text-dark-charcoal">{subtitle}</p>
        <textarea
          value={content}
          readOnly
          className="mt-5 min-h-[220px] w-full resize-y rounded-card border border-app-line bg-app-bg p-4 text-sm leading-6 text-midnight-ink"
        />
        {maxLength !== null ? (
          <p className={`mt-2 text-xs ${overLimit ? 'text-vibrant-orange' : 'text-app-muted'}`}>
            {contentLength} / {maxLength} ký tự
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">{children}</div>
      </div>
    </div>
  )
}