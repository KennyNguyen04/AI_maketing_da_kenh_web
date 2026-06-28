'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { VoiceProfilePreview } from '@/features/brand-vault/components/VoiceProfilePreview'
import type { VoiceProfile } from '@/features/brand-vault/components/VoiceProfilePreview'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Toast } from '@/components/ui/Toast'

export default function OnboardingConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const vaultId = searchParams.get('vaultId')
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!vaultId) {
      router.push('/onboarding')
      return
    }

    async function loadVault() {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.push('/login')
          return
        }
        setCurrentUserId(userData.user.id)

        // IDOR defense: explicitly filter by user_id (in addition to RLS)
        const { data, error } = await supabase
          .from('brand_vaults')
          .select('voice_profile, system_prompt, user_id')
          .eq('id', vaultId)
          .eq('user_id', userData.user.id)
          .single()

        if (error || !data) {
          setToast({ type: 'error', message: 'Không tìm thấy Brand Vault hoặc bạn không có quyền truy cập' })
          return
        }

        setVoiceProfile(data.voice_profile as VoiceProfile)
        setSystemPrompt(data.system_prompt || '')
      } catch (error) {
        console.error('Error loading vault:', error)
        setToast({ type: 'error', message: 'Có lỗi xảy ra khi tải dữ liệu' })
      } finally {
        setLoading(false)
      }
    }

    loadVault()
  }, [vaultId, router, supabase])

  async function handleSave() {
    if (!vaultId || !voiceProfile || !currentUserId) return

    setSaving(true)
    try {
      // IDOR defense: explicitly filter by user_id (in addition to RLS)
      const { error } = await supabase
        .from('brand_vaults')
        .update({
          voice_profile: voiceProfile,
          system_prompt: systemPrompt,
        })
        .eq('id', vaultId)
        .eq('user_id', currentUserId)

      if (error) throw error

      setToast({ type: 'success', message: 'Đã lưu Brand Vault thành công!' })
      setTimeout(() => router.push('/dashboard'), 1200)
    } catch (error) {
      console.error('Error saving vault:', error)
      setToast({ type: 'error', message: 'Không thể lưu Brand Vault' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[760px]">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-app-muted">Đang tải Brand Vault...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="mx-auto max-w-[760px]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-10">
        <p className="text-sm font-medium text-sky-blue">Step 2 of 2 - Xác nhận Brand Vault</p>
        <div className="mt-3 h-1 rounded-full bg-muted-stone">
          <div className="h-1 w-full rounded-full bg-sky-blue" />
        </div>
      </div>

      <h1 className="text-[48px] leading-none text-midnight-ink">Xác nhận giọng văn</h1>
      <p className="mt-5 text-dark-charcoal">
        Kiểm tra lại thông tin giọng văn AI đã phân tích. Bạn có thể chỉnh sửa trước khi lưu.
      </p>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          isVisible
          onClose={() => setToast(null)}
        />
      )}

      {voiceProfile && (
        <Card className="mt-8 space-y-4">
          <VoiceProfilePreview
            profile={voiceProfile}
            systemPrompt={systemPrompt}
            onChange={setVoiceProfile}
            onSystemPromptChange={setSystemPrompt}
          />
        </Card>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/onboarding')}>
          Quay lại
        </Button>
        <Button size="lg" onClick={handleSave} disabled={saving || !voiceProfile}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Lưu Brand Vault
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
