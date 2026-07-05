'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { CHANNEL_LIMITS } from '@/lib/constants'
import { Card } from '@/components/ui/Card'
import { CopyButton } from './CopyButton'
import { PublishPanel } from './PublishPanel'
import { RegenerateButton } from './RegenerateButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { Toast } from '@/components/ui/Toast'

export function DraftEditor({
  draft,
  setDrafts,
  onCopied,
  onDraftDeleted,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draft: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setDrafts: React.Dispatch<React.SetStateAction<any[]>>
  onCopied: () => void
  onDraftDeleted?: () => void
}) {
  const [value, setValue] = useState(draft.content)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [regenerating, setRegenerating] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')
  const limit = CHANNEL_LIMITS[draft.channel as keyof typeof CHANNEL_LIMITS]
  const overLimit = Boolean(limit && value.length > limit)

  useEffect(() => {
    setValue(draft.content)
    setStatus('idle')
  }, [draft.id, draft.content])

  useEffect(() => {
    if (value === draft.content) return

    setStatus('saving')
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/drafts/${draft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: value })
        })
        if (!res.ok) throw new Error('Autosave failed')

        setStatus('saved')
        setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, content: value, is_edited: true } : d))
      } catch (err) {
        console.error(err)
        setStatus('error')
      }
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [value, draft.id, draft.content, setDrafts])

  async function regenerate() {
    setRegenerating(true)
    setStatus('idle')
    try {
      const res = await fetch(`/api/drafts/${draft.id}/regenerate`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Regeneration failed')

      const { draft: newDraft } = await res.json()
      setDrafts(prev => prev.map(d => d.id === draft.id ? newDraft : d))
      setToastMessage('Đã tạo lại bản nháp.')
      setToastType('success')
      setToastVisible(true)
    } catch (err) {
      console.error(err)
      setToastMessage('Không thể tạo lại bản nháp. Vui lòng thử lại.')
      setToastType('error')
      setToastVisible(true)
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-app-muted">
            <span>Phiên bản {draft.version || 1}</span>
            {draft.is_edited ? <span className="rounded-badge border border-sunset-orange/25 bg-sunset-orange/10 px-2 py-0.5 text-vibrant-orange">Đã chỉnh sửa</span> : null}
          </div>
          <div className="text-xs">
            {status === 'saving' ? <span className="flex items-center gap-1 text-app-muted"><Loader2 className="h-3 w-3 animate-spin" /> Đang lưu</span> : null}
            {status === 'saved' ? <span className="flex items-center gap-1 text-deep-moss"><CheckCircle2 className="h-3 w-3" /> Đã lưu</span> : null}
            {status === 'error' ? <span className="flex items-center gap-1 text-vibrant-orange"><AlertCircle className="h-3 w-3" /> Lỗi lưu</span> : null}
          </div>
        </div>

        {regenerating ? (
          <div className="rounded-card border border-app-line p-4">
            <Skeleton variant="text" className="mb-3 w-2/3" />
            <Skeleton variant="card" className="h-[220px]" />
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-[300px] w-full resize-y rounded-card border border-app-line bg-pure-canvas p-4 text-sm leading-7 text-midnight-ink outline-none transition focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/15"
          />
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={overLimit ? 'flex items-center gap-1 text-xs text-vibrant-orange' : 'text-xs text-app-muted'}>
            {overLimit ? <AlertCircle className="h-3 w-3" /> : null}
            {limit ? `${value.length} / ${limit} ký tự` : `${value.length} ký tự`}
          </p>
          <div className="flex flex-wrap gap-2">
            <RegenerateButton onRegenerate={regenerate} disabled={regenerating} />
            <CopyButton text={value} onCopied={onCopied} />
          </div>
        </div>
      </Card>

      <PublishPanel draft={draft} content={value} onDeleted={onDraftDeleted} />
      <Toast
        type={toastType}
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </div>
  )
}
