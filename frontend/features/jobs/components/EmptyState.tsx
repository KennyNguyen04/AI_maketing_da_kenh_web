'use client'

import { useRouter } from 'next/navigation'
import { FileText, Fingerprint, Plus, Sparkles } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export function JobsEmptyState() {
  const router = useRouter()
  return (
    <EmptyState
      icon={Sparkles}
      title="Chưa có nội dung nào"
      description="Bắt đầu bằng một bài viết gốc, Amplify sẽ tạo bản nháp cho từng kênh."
      action={{
        label: 'Tạo nội dung đầu tiên',
        onClick: () => router.push('/dashboard/new'),
        icon: Plus,
      }}
      steps={[
        {
          icon: Fingerprint,
          title: 'Cấu hình Brand Vault',
          description: 'Cho AI hiểu giọng thương hiệu.',
        },
        {
          icon: FileText,
          title: 'Nạp nội dung gốc',
          description: 'Dán bài viết hoặc nhập URL công khai.',
        },
        {
          icon: Sparkles,
          title: 'Tạo bản nháp đa kênh',
          description: 'Review, chỉnh sửa rồi phân phối.',
        },
      ]}
    />
  )
}
