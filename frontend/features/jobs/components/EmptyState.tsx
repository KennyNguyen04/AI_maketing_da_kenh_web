'use client'

import { useRouter } from 'next/navigation'
import { FileText, Fingerprint, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function EmptyState() {
  const router = useRouter()
  const steps = [
    { icon: Fingerprint, title: 'Cấu hình Brand Vault', desc: 'Cho AI hiểu giọng thương hiệu.' },
    { icon: FileText, title: 'Nạp nội dung gốc', desc: 'Dán bài viết hoặc nhập URL công khai.' },
    { icon: Sparkles, title: 'Tạo bản nháp đa kênh', desc: 'Review, chỉnh sửa rồi phân phối.' },
  ]

  return (
    <Card className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-hint-of-blue text-sky-blue">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg text-midnight-ink">Chưa có nội dung nào</h2>
      <p className="mt-2 text-sm text-app-muted">Bắt đầu bằng một bài viết gốc, Amplify sẽ tạo bản nháp cho từng kênh.</p>

      <div className="mx-auto mt-6 grid max-w-3xl gap-3 text-left md:grid-cols-3">
        {steps.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="rounded-card border border-app-line bg-app-bg p-4">
              <Icon className="h-5 w-5 text-sky-blue" />
              <h3 className="mt-3 text-sm font-semibold text-midnight-ink">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-app-muted">{item.desc}</p>
            </div>
          )
        })}
      </div>

      <Button className="mt-6" onClick={() => router.push('/dashboard/new')}>
        Tạo nội dung đầu tiên
      </Button>
    </Card>
  )
}
