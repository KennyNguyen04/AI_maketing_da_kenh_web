'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Channel } from '@/lib/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Toast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DraftEditor } from '@/features/review/components/DraftEditor'
import { DraftTabs } from '@/features/review/components/DraftTabs'
import { MarkDoneButton } from '@/features/review/components/MarkDoneButton'
import { SourcePanel } from '@/features/review/components/SourcePanel'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ReviewClient({ job, initialDrafts }: { job: any; initialDrafts: any[] }) {
  const router = useRouter()
  const firstChannel = (initialDrafts[0]?.channel as Channel) || 'linkedin_post'
  const [active, setActive] = useState<Channel>(firstChannel)
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [drafts, setDrafts] = useState<any[]>(initialDrafts)
  const [confirmDeleteJob, setConfirmDeleteJob] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const draft = useMemo(() => drafts.find((item) => item.channel === active) ?? drafts[0], [active, drafts])

  const title = job.title || (job.source_type === 'url' ? 'Bài viết từ URL' : 'Nội dung dán')
  const allDone = useMemo(() => drafts.every(d => d.is_done), [drafts])

  async function handleMarkDone() {
    await Promise.all(
      drafts.map(d =>
        fetch(`/api/drafts/${d.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_done: true })
        })
      )
    )

    setDrafts(prev => prev.map(d => ({ ...d, is_done: true })))
    setToast('Tất cả bản nháp đã được đánh dấu hoàn thành.')
  }

  async function handleDeleteJob() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Không thể xoá job')
      }
      setConfirmDeleteJob(false)
      router.push('/dashboard')
    } catch (error) {
      setToast(error instanceof Error ? error.message : String(error))
      setDeleting(false)
    }
  }

  function handleDraftDeleted(draftId: string) {
    setDrafts(prev => prev.filter(d => d.id !== draftId))
    setToast('Đã xoá bản nháp.')
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <button type="button" onClick={() => router.push('/dashboard')} className="mb-3 flex items-center gap-2 text-sm font-medium text-sky-blue transition hover:text-regal-violet">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
          <p className="text-sm font-medium text-app-muted">Review bản nháp</p>
          <h1 className="mt-1 max-w-4xl truncate text-2xl text-midnight-ink md:text-3xl">{title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={job.status} />
            <span className="text-xs text-app-muted">{formatDate(job.created_at)}</span>
          </div>
        </div>
        <MarkDoneButton onDone={handleMarkDone} allDone={allDone} />
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SourcePanel job={job} />
        <section className="min-w-0">
          {drafts.length > 0 ? (
            <>
              <DraftTabs drafts={drafts} active={active} onChange={setActive} />
              <div className="mt-4">
                <DraftEditor
                  draft={draft}
                  setDrafts={setDrafts}
                  onCopied={() => {
                    setCopied((count) => count + 1)
                    setToast('Đã sao chép bản nháp.')
                  }}
                  onDraftDeleted={() => handleDraftDeleted(draft.id)}
                />
              </div>
            </>
          ) : (
            <div className="rounded-card border border-app-line bg-pure-canvas p-10 text-center">
              <p className="text-sm text-dark-charcoal">Không tìm thấy bản nháp nào cho job này.</p>
            </div>
          )}
        </section>
      </div>

      <div className="sticky bottom-[64px] mt-6 flex flex-col gap-3 rounded-card border border-app-line bg-pure-canvas/95 px-4 py-3 shadow-sm backdrop-blur md:bottom-0 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-dark-charcoal">{drafts.length} bản nháp · {copied} lần sao chép</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="danger" size="sm" disabled={deleting} onClick={() => setConfirmDeleteJob(true)}>
            <Trash2 className="h-4 w-4" /> Xóa cả job
          </Button>
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>Về Dashboard</Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteJob}
        title="Xóa toàn bộ job này?"
        message={`Job "${title}" và ${drafts.length} bản nháp sẽ bị ẩn. Lịch sử đăng bài (nếu có) vẫn được giữ để thống kê. Nếu có bản nháp đang chờ Extension đăng, bạn cần huỷ lịch trước.`}
        confirmText="Xóa cả job"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteJob}
        onCancel={() => setConfirmDeleteJob(false)}
      />

      <Toast type="success" message={toast} isVisible={Boolean(toast)} onClose={() => setToast('')} />
    </div>
  )
}
