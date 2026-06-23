'use client'

import { useRouter } from 'next/navigation'
import { Edit3, Fingerprint, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BrandVaultStatus({ vault }: { vault: any }) {
  const router = useRouter()

  if (!vault) {
    return (
      <Card className="border-dashed border-sunset-orange/35 bg-sunset-orange/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-sunset-orange/10 text-vibrant-orange">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base text-midnight-ink">Chưa cấu hình Brand Vault</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-dark-charcoal">
                Thiết lập giọng thương hiệu để AI tạo nội dung nhất quán hơn cho từng kênh.
              </p>
            </div>
          </div>
          <Button onClick={() => router.push('/onboarding')} className="shrink-0">
            <Plus className="h-4 w-4" /> Thiết lập ngay
          </Button>
        </div>
      </Card>
    )
  }

  const voiceProfile = typeof vault.voice_profile === 'string' ? JSON.parse(vault.voice_profile) : vault.voice_profile
  const tone = voiceProfile?.tone?.slice(0, 3).join(' · ') || 'Mặc định'

  return (
    <Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-card bg-hint-of-blue text-sky-blue">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base text-midnight-ink">{vault.name}</h2>
              <Tag color="green" label="Đang hoạt động" />
            </div>
            <p className="mt-1 text-sm text-app-muted">Tone: {tone}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/onboarding')}>
          <Edit3 className="h-4 w-4" /> Chỉnh sửa
        </Button>
      </div>
    </Card>
  )
}
