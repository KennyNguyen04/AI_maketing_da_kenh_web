'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export function JobStatusPoller({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<string>('pending')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // MOCK steps for UI purely for visual feedback since we don't track per-channel status yet
  const [completedSteps, setCompletedSteps] = useState<number>(0)
  
  useEffect(() => {
    // Visual progress effect
    const timer = setInterval(() => {
      setCompletedSteps(c => (c < 4 ? c + 1 : c))
    }, 1500)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!jobId) return
    if (status === 'done' || status === 'failed') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`)
        const data = await res.json()
        
        if (data.job) {
          setStatus(data.job.status)
          if (data.job.status === 'failed') {
            setErrorMsg(data.job.error_message || 'Tạo nội dung thất bại.')
          }
          if (data.job.status === 'done') {
            clearInterval(interval)
            // Wait a moment for UX before redirecting
            setTimeout(() => {
              router.push(`/review/${jobId}`)
            }, 1000)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, status, router])

  const steps = [
    'Khởi tạo Job...',
    'Đọc Brand Vault...',
    'Gọi AI tạo nội dung...',
    'Lưu bản nháp...'
  ]

  return (
    <Card variant="sand" className="p-12 text-center">
      {status === 'failed' ? (
        <>
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-vibrant-orange" />
          <h2 className="text-2xl text-midnight-ink">Đã xảy ra lỗi</h2>
          <p className="mt-2 text-vibrant-orange">{errorMsg}</p>
        </>
      ) : status === 'done' ? (
        <>
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-forest-fern" />
          <h2 className="text-2xl text-midnight-ink">Hoàn tất!</h2>
          <p className="mt-2 text-dark-charcoal">Đang chuyển sang màn hình Review...</p>
        </>
      ) : (
        <>
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-sky-blue" />
          <h2 className="text-2xl text-midnight-ink">AI đang tạo nội dung...</h2>
          <div className="mx-auto mt-8 max-w-sm space-y-3 text-left">
            {steps.map((step, index) => {
              const done = completedSteps > index || status === 'done'
              const Icon = done ? CheckCircle2 : Circle
              return (
                <div key={step} className={done ? 'flex items-center gap-3 text-sm text-sky-blue' : 'flex items-center gap-3 text-sm text-light-gray transition-colors duration-500'}>
                  <Icon className="h-5 w-5" />
                  {step}
                </div>
              )
            })}
          </div>
        </>
      )}
    </Card>
  )
}
