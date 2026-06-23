'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { VoiceProfilePreview, VoiceProfile } from '@/features/brand-vault/components/VoiceProfilePreview'
import { createClient } from '@/lib/supabase/client'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const vaultId = searchParams.get('vaultId')
  
  const [toast, setToast] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<VoiceProfile | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    if (!vaultId) {
      router.push('/onboarding')
      return
    }

    async function fetchVault() {
      const { data, error } = await supabase
        .from('brand_vaults')
        .select('voice_profile')
        .eq('id', vaultId)
        .single()

      if (error || !data) {
        setError('Không tìm thấy bản phân tích.')
      } else {
        setProfile(data.voice_profile)
      }
      setLoading(false)
    }

    fetchVault()
  }, [vaultId, router, supabase])

  async function save() {
    if (!profile || !vaultId) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/brand-vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultId, voice_profile: profile })
      })

      if (!res.ok) {
        throw new Error('Không thể lưu cấu hình')
      }

      setToast(true)
      window.setTimeout(() => router.push('/dashboard'), 900)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-dark-charcoal">Đang tải cấu hình... / Loading profile...</div>
  }

  if (error || !profile) {
    return (
      <div className="py-20 text-center text-vibrant-orange">
        <p>{error}</p>
        <Button className="mt-4" onClick={() => router.push('/onboarding')}>Thử lại / Try again</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[840px]">
      <div className="mb-10">
        <p className="text-sm font-medium text-sky-blue">Bước 2 / 2 - Xác nhận Brand Vault</p>
        <div className="mt-3 h-1 rounded-full bg-sky-blue" />
      </div>
      <h1 className="text-[40px] text-midnight-ink">AI đã hiểu giọng văn của bạn.</h1>
      <p className="mt-3 text-dark-charcoal">Xem lại và chỉnh sửa nếu cần. Bạn có thể cập nhật sau.</p>
      
      {error && <div className="mt-4 rounded-md bg-vibrant-orange/10 p-3 text-sm text-vibrant-orange">{error}</div>}
      
      <div className="mt-10">
        <VoiceProfilePreview profile={profile} onChange={setProfile} />
      </div>
      <div className="mt-10 flex justify-end gap-3">
        <Button variant="ghost" onClick={() => router.push('/onboarding')}>&lt;- Chỉnh lại / Edit</Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu Brand Vault / Save Brand Vault ->'}
        </Button>
      </div>
      <Toast type="success" message="Brand Vault đã được lưu! / Brand Vault saved!" isVisible={toast} onClose={() => setToast(false)} />
    </div>
  )
}

export default function OnboardingConfirmPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-dark-charcoal">Đang tải... / Loading...</div>}>
      <ConfirmContent />
    </Suspense>
  )
}
