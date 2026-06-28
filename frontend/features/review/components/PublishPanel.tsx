'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Facebook, Linkedin, Loader2, RotateCcw, Send, Twitter, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TimeSlotPicker } from '@/features/scheduler'
import type { SocialAccount } from '@/lib/types'

interface DraftForPublish {
  id: string
  channel: string
  content: string
}

interface PublishAttempt {
  id: string
  provider: 'x' | 'facebook'
  status: 'draft' | 'publishing' | 'published' | 'failed'
  error_message?: string
  external_post_url?: string
  created_at: string
}

type BusyState = 'x' | 'facebook' | 'fallback' | 'retry' | 'schedule' | null

export function PublishPanel({ draft, content }: { draft: DraftForPublish; content: string }) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [busy, setBusy] = useState<BusyState>(null)
  const [message, setMessage] = useState('')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [xOpen, setXOpen] = useState(false)
  const [facebookOpen, setFacebookOpen] = useState(false)
  const [linkedinOpen, setLinkedinOpen] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState<PublishAttempt[]>([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const canSchedule = draft.channel === 'twitter' || draft.channel === 'facebook'
  const scheduleChannelLabel = draft.channel === 'twitter' ? 'X' : 'Facebook'

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch('/api/social/accounts')
        const data = await res.json()
        setAccounts(data.accounts || [])
      } finally {
        setLoadingAccounts(false)
      }
    }
    loadAccounts()
  }, [])

  const xAccount = useMemo(() => accounts.find((account) => account.provider === 'x'), [accounts])
  const facebookAccount = useMemo(() => accounts.find((account) => account.provider === 'facebook'), [accounts])
  const overXLimit = content.length > 280

  async function publish(provider: 'x' | 'facebook', accountId?: string) {
    setBusy(provider)
    setMessage('')
    setPublishedUrl('')
    try {
      const res = await fetch(`/api/publish/${draft.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, account_id: accountId }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errorMsg = data.error || 'Publish failed'
        // Check if it's rate limit error
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setMessage(`Rate limit: ${errorMsg}`)
        } else {
          throw new Error(errorMsg)
        }
        return
      }
      setPublishedUrl(data.externalPostUrl)
      setMessage(provider === 'x' ? 'Đã đăng lên X.' : 'Đã đăng lên Facebook Page.')
      setXOpen(false)
      setFacebookOpen(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  async function retryPublish(provider: 'x' | 'facebook') {
    setBusy('retry')
    setMessage('')
    setPublishedUrl('')
    try {
      const res = await fetch(`/api/publish/${draft.id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errorMsg = data.error || 'Retry failed'
        if (data.code === 'RATE_LIMIT_EXCEEDED') {
          setMessage(`Rate limit: ${errorMsg}`)
        } else {
          throw new Error(errorMsg)
        }
        return
      }
      setPublishedUrl(data.externalPostUrl)
      setMessage(`Đã đăng thành công lên ${provider === 'x' ? 'X' : 'Facebook'}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(null)
    }
  }

  async function manualHandoff(provider: 'x' | 'facebook' | 'linkedin') {
    setBusy('fallback')
    setMessage('')
    await navigator.clipboard.writeText(content)
    if (provider === 'linkedin') {
      window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank', 'noopener,noreferrer')
      setMessage('Đã sao chép nội dung và mở LinkedIn. Hãy dán, chỉnh sửa rồi tự bấm đăng.')
      setBusy(null)
      setLinkedinOpen(false)
      return
    }

    const res = await fetch(`/api/publish/${draft.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, mode: 'fallback' }),
    })
    const fallbackUrl = provider === 'x' ? 'https://x.com/compose/post' : 'https://www.facebook.com/'
    const data = await res.json().catch(() => ({ handoffUrl: fallbackUrl }))
    window.open(data.handoffUrl || fallbackUrl, '_blank', 'noopener,noreferrer')
    setMessage(provider === 'x'
      ? 'Đã sao chép nội dung và mở X. Hãy dán, chỉnh sửa rồi tự bấm đăng.'
      : 'Đã sao chép nội dung và mở Facebook. Hãy dán, chỉnh sửa rồi tự bấm đăng.'
    )
    setBusy(null)
    setXOpen(false)
    setFacebookOpen(false)
    setLinkedinOpen(false)
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
      setMessage(`Đã lên lịch đăng bài vào ${scheduledFor.toLocaleString('vi-VN')}`)
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
            Mỗi nút Prepare chỉ mở bước xem lại. Amplify không tự đăng nếu bạn chưa xác nhận.
          </p>
          {message ? (
            <p className={`mt-3 text-xs font-medium ${message.includes('thành công') || message.includes('Đã đăng') ? 'text-regal-violet' : 'text-vibrant-orange'}`}>
              {message}
            </p>
          ) : null}
          {publishedUrl ? (
            <a href={publishedUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-blue">
              Xem bài đã đăng <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => setXOpen(true)}>
            <Twitter className="h-4 w-4" /> Prepare X
          </Button>
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => setFacebookOpen(true)}>
            <Facebook className="h-4 w-4" /> Prepare Facebook
          </Button>
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => setLinkedinOpen(true)}>
            <Linkedin className="h-4 w-4" /> Prepare LinkedIn
          </Button>
          {canSchedule && (
            <Button size="sm" variant="white" disabled={busy !== null} onClick={() => setShowScheduleModal(true)}>
              {busy === 'schedule' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Lên lịch {scheduleChannelLabel}
            </Button>
          )}
        </div>
      </div>

      {overXLimit ? <p className="text-xs text-vibrant-orange">Bản nháp dài hơn 280 ký tự. Hãy rút gọn trước khi đăng trực tiếp lên X.</p> : null}
      {!xAccount && !loadingAccounts ? <p className="text-xs text-app-muted">Khi chưa kết nối tài khoản, app sẽ dùng Copy + Open để bạn tự đăng thủ công.</p> : null}

      {xOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-black/40 p-4">
          <div className="w-full max-w-[680px] rounded-card border border-app-line bg-pure-canvas p-6 shadow-lg">
            <h2 className="text-xl text-midnight-ink">Prepare X post</h2>
            <p className="mt-2 text-sm text-dark-charcoal">
              Kiểm tra nội dung trước khi chuyển sang X. Bạn là người thực hiện thao tác đăng cuối cùng.
            </p>
            <textarea
              value={content}
              readOnly
              className="mt-5 min-h-[220px] w-full resize-y rounded-card border border-app-line bg-app-bg p-4 text-sm leading-6 text-midnight-ink"
            />
            <div className="mt-3 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
              <p className={overXLimit ? 'text-vibrant-orange' : 'text-app-muted'}>{content.length} / 280 ký tự</p>
              <p className="text-app-muted">{xAccount ? `Tài khoản: ${xAccount.display_name}` : 'Chưa kết nối X. Có thể Copy + Open.'}</p>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setXOpen(false)}>Hủy</Button>
              <Button variant="ghost" onClick={() => manualHandoff('x')} disabled={busy !== null}>
                {busy === 'fallback' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Copy + Open X
              </Button>
              <Button onClick={() => xAccount ? publish('x', xAccount.id) : manualHandoff('x')} disabled={busy !== null || overXLimit}>
                {busy === 'x' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Đăng lên X
              </Button>
              {xAccount && (
                <Button variant="white" onClick={() => retryPublish('x')} disabled={busy !== null}>
                  {busy === 'retry' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Thử lại
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {facebookOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-black/40 p-4">
          <div className="w-full max-w-[680px] rounded-card border border-app-line bg-pure-canvas p-6 shadow-lg">
            <h2 className="text-xl text-midnight-ink">Prepare Facebook Page post</h2>
            <p className="mt-2 text-sm text-dark-charcoal">Xem lại nội dung trước khi đăng lên Page hoặc mở Facebook để đăng thủ công.</p>
            <textarea
              value={content}
              readOnly
              className="mt-5 min-h-[260px] w-full resize-y rounded-card border border-app-line bg-app-bg p-4 text-sm leading-6 text-midnight-ink"
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-app-muted">{facebookAccount ? `Page: ${facebookAccount.display_name}` : 'Chưa kết nối Facebook Page. Có thể Copy + Open.'}</p>
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="ghost" onClick={() => setFacebookOpen(false)}>Hủy</Button>
                <Button variant="ghost" onClick={() => manualHandoff('facebook')} disabled={busy !== null}>
                  {busy === 'fallback' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Copy + Open
                </Button>
                <Button onClick={() => facebookAccount ? publish('facebook', facebookAccount.id) : manualHandoff('facebook')} disabled={busy !== null}>
                  {busy === 'facebook' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Đăng lên Page
                </Button>
                {facebookAccount && (
                  <Button variant="white" onClick={() => retryPublish('facebook')} disabled={busy !== null}>
                    {busy === 'retry' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Thử lại
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {linkedinOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-black/40 p-4">
          <div className="w-full max-w-[680px] rounded-card border border-app-line bg-pure-canvas p-6 shadow-lg">
            <h2 className="text-xl text-midnight-ink">Prepare LinkedIn post</h2>
            <p className="mt-2 text-sm text-dark-charcoal">
              LinkedIn không có compose URL ổn định để prefill text. Amplify sẽ sao chép nội dung rồi mở LinkedIn để bạn tự dán và đăng.
            </p>
            <textarea
              value={content}
              readOnly
              className="mt-5 min-h-[260px] w-full resize-y rounded-card border border-app-line bg-app-bg p-4 text-sm leading-6 text-midnight-ink"
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-app-muted">Bạn vẫn kiểm soát nội dung và thao tác đăng cuối cùng.</p>
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="ghost" onClick={() => setLinkedinOpen(false)}>Hủy</Button>
                <Button variant="ghost" onClick={() => manualHandoff('linkedin')} disabled={busy !== null}>
                  {busy === 'fallback' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Copy + Open LinkedIn
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Schedule Modal */}
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
