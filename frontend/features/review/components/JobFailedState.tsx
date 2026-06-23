'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, HelpCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JobFailedState({ job }: { job: any }) {
  const router = useRouter()
  const errorMsg = job?.error_message || 'Không thể kết nối với dịch vụ AI hoặc đọc dữ liệu từ nguồn.'
  const title = job?.title || (job?.source_type === 'url' ? 'Bài viết từ URL' : 'Nội dung dán')

  const retryParams = new URLSearchParams()
  if (job?.source_type) retryParams.set('source_type', job.source_type)
  if (job?.title) retryParams.set('title', job.title)
  if (job?.channels) retryParams.set('channels', job.channels.join(','))

  const handleRetry = () => {
    if (job?.source_type === 'text' && job?.source_content) {
      sessionStorage.setItem('amplify_retry_content', job.source_content)
    } else if (job?.source_type === 'url' && job?.source_content) {
      retryParams.set('url', job.source_content)
    }
    router.push(`/dashboard/new?${retryParams.toString()}`)
  }

  return (
    <div className="mx-auto max-w-[820px] space-y-6">
      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 text-sm font-medium text-sky-blue transition hover:text-regal-violet"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại Dashboard
      </button>

      <Card className="border-sunset-orange/25 bg-sunset-orange/5 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-card bg-sunset-orange/10 text-vibrant-orange">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl text-midnight-ink">Tái chế nội dung thất bại</h1>
            <p className="mt-2 text-sm leading-6 text-dark-charcoal">
              Job không hoàn tất. Bạn có thể kiểm tra lỗi bên dưới rồi tạo lại từ dữ liệu cũ.
            </p>

            <div className="mt-5 rounded-card border border-app-line bg-pure-canvas p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-midnight-ink">
                <HelpCircle className="h-4 w-4 text-app-muted" /> Thông tin lỗi
              </h3>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[120px_1fr]">
                <dt className="text-app-muted">Job</dt>
                <dd className="font-medium text-midnight-ink">{title}</dd>
                <dt className="text-app-muted">Nguồn</dt>
                <dd className="capitalize text-midnight-ink">{job?.source_type === 'url' ? 'URL' : 'Text'}</dd>
                <dt className="text-app-muted">Lý do</dt>
                <dd className="whitespace-pre-wrap rounded-card border border-sunset-orange/15 bg-sunset-orange/5 px-3 py-2 font-mono text-xs leading-5 text-vibrant-orange">
                  {errorMsg}
                </dd>
              </dl>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>Về Dashboard</Button>
              <Button onClick={handleRetry}>
                <RefreshCw className="h-4 w-4" /> Tạo lại từ dữ liệu cũ
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
