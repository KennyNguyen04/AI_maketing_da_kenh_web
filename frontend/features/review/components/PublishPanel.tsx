'use client'

import { useEffect, useState } from 'react'
import { Calendar, ExternalLink, Facebook, Loader2, Send, Trash2, Twitter, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TimeSlotPicker } from '@/features/scheduler'
import { MediaUploader } from './MediaUploader'

interface DraftForPublish {
  id: string
  channel: string
  content: string
}

type BusyState = 'x' | 'facebook' | 'linkedin' | 'threads' | 'instagram' | 'schedule' | 'post-now' | null

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

export function PublishPanel({
  draft,
  content,
  onDeleted,
}: {
  draft: DraftForPublish
  content: string
  onDeleted?: () => void
}) {
  const [extensionOnline, setExtensionOnline] = useState(false)
  const [extensionChecked, setExtensionChecked] = useState(false)
  const [busy, setBusy] = useState<BusyState>(null)
  const [message, setMessage] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [openDialog, setOpenDialog] = useState<'x' | 'facebook' | 'threads' | 'instagram' | 'linkedin' | null>(null)
  const [imageRefs, setImageRefs] = useState<string[]>([])
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const channelInfo = CHANNEL_LABELS[draft.channel] ?? CHANNEL_LABELS.x
  const canSchedule = SCHEDULABLE_CHANNELS.has(draft.channel)
  const overXLimit = content.length > 280 && (draft.channel === 'x' || draft.channel === 'twitter')

  useEffect(() => {
    // /api/extension/health uses cookie auth (no Bearer) — safe to call from webapp.
    fetch('/api/extension/health')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setExtensionOnline(Boolean(d?.connected)))
      .catch(() => setExtensionOnline(false))
      .finally(() => setExtensionChecked(true))
  }, [])

  async function copyAndOpen(key: 'x' | 'facebook' | 'threads' | 'instagram' | 'linkedin') {
    setBusy(key)
    setMessage('')
    try {
      // Log a 'draft' row so /api/publish/history + analytics counts manual posts.
      // Backend /api/publish/[draftId] only accepts provider ∈ ['x','facebook']; others skip.
      if (key === 'x' || key === 'facebook') {
        try {
          await fetch(`/api/publish/${draft.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: key, mode: 'fallback' }),
          })
        } catch {
          // Silent — analytics is best-effort.
        }
      }
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
        body: JSON.stringify({
          scheduledFor: scheduledFor.toISOString(),
          imageRefs,
        }),
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

  async function handlePostNow() {
    setBusy('post-now')
    setMessage('')
    try {
      // /api/schedule/[draftId] rejects scheduledDate <= now, so add a 60s buffer.
      // Extension polls with lte('scheduled_for', now), so it'll pick the task up immediately.
      const scheduledFor = new Date(Date.now() + 60_000)
      const res = await fetch(`/api/schedule/${draft.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledFor: scheduledFor.toISOString(),
          imageRefs,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to enqueue post')
      const attachmentNote = imageRefs.length > 0 ? ` (đính kèm ${imageRefs.length} ảnh)` : ' (text-only)'
      setMessage(
        extensionOnline
          ? `Đã gửi tới Extension${attachmentNote}. Extension sẽ đăng trong vài giây. Mở trang lịch sử để theo dõi.`
          : `Đã xếp hàng đợi${attachmentNote} (Extension đang offline). Mở Extension trên Chrome để Extension đăng ngay khi online.`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Không thể xoá bản nháp')
      }
      setConfirmDelete(false)
      onDeleted?.()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-medium text-midnight-ink">Phân phối nội dung</p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-app-muted">
            Amplify không tự đăng lên mạng xã hội. Bạn có thể <strong>Copy + Open</strong> để dán thủ công, <strong>Lên lịch</strong> để Extension tự động đăng, hoặc <strong>Đăng ngay</strong> qua Extension (Extension sẽ đăng trong &lt;60s — giữ tab này mở).
          </p>
          {message ? (
            <p className="mt-3 text-xs font-medium text-vibrant-orange">{message}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => setConfirmDelete(true)} aria-label="Xóa bản nháp">
            <Trash2 className="h-4 w-4" /> Xóa
          </Button>
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
          {canSchedule && (
            <Button
              size="sm"
              variant="white"
              disabled={busy !== null || !extensionChecked || isUploadingMedia}
              onClick={handlePostNow}
              title={
                isUploadingMedia
                  ? 'Đang tải ảnh lên, vui lòng đợi...'
                  : extensionOnline
                  ? 'Extension sẽ đăng bài này trong vài giây — giữ tab này mở'
                  : 'Extension offline — task sẽ đợi đến khi Extension chạy lại'
              }
            >
              {busy === 'post-now' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Đăng ngay qua Extension
            </Button>
          )}
        </div>
      </div>

      {canSchedule ? (
        <MediaUploader
          uploadIds={imageRefs}
          onChange={setImageRefs}
          onUploadingChange={setIsUploadingMedia}
          maxFiles={draft.channel === 'x' || draft.channel === 'twitter' ? 4 : 4}
        />
      ) : null}

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

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Xóa bản nháp này?"
        message="Bản nháp sẽ bị ẩn khỏi danh sách và không thể dùng để đăng hay lên lịch nữa. Dữ liệu gốc vẫn được giữ trong hệ thống."
        confirmText="Xóa bản nháp"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
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