'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { VoiceProfilePreview } from '@/features/brand-vault/components/VoiceProfilePreview'
import type { VoiceProfile } from '@/features/brand-vault/components/VoiceProfilePreview'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Toast } from '@/components/ui/Toast'

const CONFIRM_POLL_INTERVAL_MS = 2000
const CONFIRM_MAX_POLL_ATTEMPTS = 150 // ~5 minutes

export default function OnboardingConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const vaultId = searchParams.get('vaultId')
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [waitingForAnalysis, setWaitingForAnalysis] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollAttemptsRef = useRef(0)

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  useEffect(() => {
    if (!vaultId) {
      router.push('/onboarding')
      return
    }

    async function loadVault(isPolling = false) {
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.push('/login')
          return
        }
        setCurrentUserId(userData.user.id)

        // IDOR defense: explicitly filter by user_id (in addition to RLS)
        // Also select error_message so we can short-circuit polling when the
        // worker has reported a failure (e.g. Gemini error, e-commerce page).
        const { data, error } = await supabase
          .from('brand_vaults')
          .select('voice_profile, system_prompt, user_id, is_active, error_message')
          .eq('id', vaultId!)
          .eq('user_id', userData.user.id)
          .single()

        if (error || !data) {
          setToast({ type: 'error', message: 'Không tìm thấy Brand Vault hoặc bạn không có quyền truy cập' })
          setLoading(false)
          setWaitingForAnalysis(false)
          stopPolling()
          return
        }

        // Worker reported a failure — surface it immediately instead of
        // spinning the polling UI for another 5 minutes. Without this,
        // users would see "Đang phân tích..." even after the analysis has
        // terminally failed, and then /dashboard/new would not show voice
        // (because voice_profile never got set), making the symptom look
        // like "voice disappeared" when in reality it was never saved.
        if (data.error_message && !data.voice_profile) {
          stopPolling()
          setWaitingForAnalysis(false)
          setLoading(false)
          setToast({
            type: 'error',
            message: `Phân tích thất bại: ${data.error_message} Vui lòng thử lại hoặc dùng nguồn khác.`,
          })
          return
        }

        // Vault exists but Inngest hasn't finished analyzing yet
        if (!data.voice_profile) {
          if (!isPolling) {
            // First call — start polling and show waiting state
            setWaitingForAnalysis(true)
            setLoading(false)
            pollAttemptsRef.current = 0

            pollIntervalRef.current = setInterval(async () => {
              pollAttemptsRef.current += 1

              if (pollAttemptsRef.current >= CONFIRM_MAX_POLL_ATTEMPTS) {
                stopPolling()
                setWaitingForAnalysis(false)
                setToast({ type: 'error', message: 'Quá thời gian chờ phân tích. Vui lòng thử lại.' })
                return
              }

              await loadVault(true)
            }, CONFIRM_POLL_INTERVAL_MS)
          } else {
            // Still waiting — keep polling (state already set)
            return
          }
        } else {
          // Analysis complete — render profile
          stopPolling()
          setVoiceProfile(data.voice_profile as VoiceProfile)
          setSystemPrompt(data.system_prompt || '')
          setLoading(false)
          setWaitingForAnalysis(false)
        }
      } catch (error) {
        console.error('Error loading vault:', error)
        setToast({ type: 'error', message: 'Có lỗi xảy ra khi tải dữ liệu' })
        setLoading(false)
        setWaitingForAnalysis(false)
        stopPolling()
      }
    }

    loadVault(false)
  }, [vaultId, router, supabase, stopPolling])

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
          is_active: true,
        })
        .eq('id', vaultId)
        .eq('user_id', currentUserId)

      if (error) throw error

      setToast({ type: 'success', message: 'Đã lưu Brand Vault thành công!' })
      setTimeout(() => router.push('/vaults'), 1200)
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

  if (waitingForAnalysis) {
    return (
      <div className="mx-auto max-w-[760px]">
        <div className="mb-10">
          <p className="text-sm font-medium text-sky-blue">Step 2 of 2 - Xác nhận Brand Vault</p>
          <div className="mt-3 h-1 rounded-full bg-muted-stone">
            <div className="h-1 w-3/4 rounded-full bg-sky-blue" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mx-auto mb-8 h-16 w-16 rounded-full border-4 border-muted-stone border-t-sky-blue [animation:spin_.8s_linear_infinite]" />
          <h2 className="text-[28px] text-midnight-ink">AI đang phân tích giọng văn...</h2>
          <p className="mt-3 text-sm text-app-muted">Đang xây Brand Vault từ nội dung của bạn. Vui lòng đợi trong giây lát.</p>
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
