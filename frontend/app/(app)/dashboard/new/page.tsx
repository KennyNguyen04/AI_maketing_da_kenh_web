'use client'

import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft } from 'lucide-react'
import { NewJobForm } from '@/features/jobs/components/NewJobForm'

export default function NewJobPage() {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <button type="button" onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm font-medium text-sky-blue transition hover:text-regal-violet">
        <ArrowLeft className="h-4 w-4" /> Quay lại Dashboard
      </button>
      <header>
        <p className="text-sm font-medium text-app-muted">Tạo nội dung</p>
        <h1 className="mt-1 text-2xl text-midnight-ink md:text-3xl">Tạo bản nháp đa kênh</h1>
        <p className="mt-2 max-w-[720px] text-sm leading-6 text-dark-charcoal">
          Nạp nội dung gốc, chọn kênh cần tái chế và để AI tạo bản nháp theo Brand Vault của bạn.
        </p>
      </header>
      <Suspense fallback={<div className="text-sm text-app-muted">Đang tải form...</div>}>
        <NewJobForm />
      </Suspense>
    </div>
  )
}
