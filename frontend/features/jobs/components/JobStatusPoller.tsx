'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const MAX_POLL_ATTEMPTS = 150 // ~5 minutes at 2s interval

export function JobStatusPoller({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<string>('pending')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Visual progress effect
  const [completedSteps, setCompletedSteps] = useState<number>(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)

  const stopPolling = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCompletedSteps(c => (c < 4 ? c + 1 : c))
    }, 1500)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!jobId) return
    if (status === 'done' || status === 'failed') return
    if (intervalRef.current !== null) return // already polling

    intervalRef.current = setInterval(async () => {
      attemptsRef.current += 1

      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling()
        setStatus('failed')
        setErrorMsg('Quá thời gian chờ. Vui lòng thử lại.')
        return
      }

      try {
        const res = await fetch(`/api/jobs/${jobId}`)
        const data = await res.json()

        if (data.job) {
          setStatus(data.job.status)
          if (data.job.status === 'failed') {
            stopPolling()
            setErrorMsg(data.job.error_message || 'Tạo nội dung thất bại.')
          }
          if (data.job.status === 'done') {
            stopPolling()
            setTimeout(() => {
              router.push(`/review/${jobId}`)
            }, 1000)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 2000)

    return () => stopPolling()
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
