'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Layers } from 'lucide-react'
import { AnalyzingLoader } from '@/features/brand-vault/components/AnalyzingLoader'
import { BrandVaultSetupForm } from '@/features/brand-vault/components/BrandVaultSetupForm'
import { BrandVaultSetupText } from '@/features/brand-vault/components/BrandVaultSetupText'
import { FlowSelector, OnboardingFlow } from '@/features/brand-vault/components/FlowSelector'
import { createClient } from '@/lib/supabase/client'

const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 150 // ~5 minutes

export default function OnboardingPage() {
  const router = useRouter()
  const [flow, setFlow] = useState<OnboardingFlow>('content')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forceRefresh, setForceRefresh] = useState(false)
  const supabase = createClient()
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

  async function handleTextSubmit(mode: string, value: string) {
    setLoading(true)
    setError('')
    pollAttemptsRef.current = 0

    try {
      const endpoint = mode === 'url' ? '/api/brand-vault/analyze-url' : '/api/brand-vault/analyze-text'
      const payload = mode === 'url'
        ? { url: value, forceRefresh }
        : { text: value, forceRefresh }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        // Show server-side detail (e.g. "column display_name does not
        // exist") instead of a generic "Failed to start analysis" so
        // users and developers can immediately see the root cause.
        const detail = errorData.detail || errorData.error || 'Failed to start analysis'
        throw new Error(detail)
      }

      const { vaultId } = await res.json()

      pollIntervalRef.current = setInterval(async () => {
        pollAttemptsRef.current += 1

        if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
          stopPolling()
          setLoading(false)
          setError('Quá thời gian chờ phân tích. Vui lòng thử lại.')
          return
        }

        const { data, error } = await supabase
          .from('brand_vaults')
          .select('is_active, voice_profile, user_id, error_message')
          .eq('id', vaultId)
          .single()

        // IDOR defense: verify vault belongs to current user
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user || data?.user_id !== userData.user.id) {
          stopPolling()
          setLoading(false)
          setError('Không tìm thấy Brand Vault hoặc bạn không có quyền truy cập')
          return
        }

        if (error) {
          stopPolling()
          setLoading(false)
          setError('Lỗi khi lấy dữ liệu: ' + error.message)
          return
        }

        // Worker marks vault inactive only when analysis has truly failed.
        // We can't use "still false at this poll iteration" as the failure signal
        // because the row starts with `is_active=false` at insert time and the
        // worker needs 6-30+ seconds to fetch + parse + analyze. We instead wait
        // for a generous attempt budget (>=15 attempts ~= 30s) AND additionally
        // verify that the worker has actually reported a failure via
        // `error_message` (set on `extractTextFromUrl` exceptions).
        if (
          data &&
          !data.is_active &&
          !data.voice_profile &&
          pollAttemptsRef.current >= 15 &&
          (data as { error_message?: string | null }).error_message
        ) {
          const errMsg =
            (data as { error_message?: string | null }).error_message ||
            'Không rõ lý do'
          stopPolling()
          setLoading(false)
          setError(
            `Phân tích URL thất bại: ${errMsg} Vui lòng thử URL khác hoặc dùng tuỳ chọn "Dán text".`,
          )
          return
        }

        if (data?.is_active && data?.voice_profile) {
          stopPolling()
          router.push(`/onboarding/confirm?vaultId=${vaultId}`)
        }
      }, POLL_INTERVAL_MS)

    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  async function handleFormSubmit(formData: { topics: string; tone: string; audience: string; style: string; samples: string }) {
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/brand-vault/from-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, forceRefresh })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const detail = errorData.detail || errorData.error || 'Failed to create brand vault'
        throw new Error(detail)
      }

      const { vaultId } = await res.json()
      
      // Synchronous analysis completes immediately, so redirect directly to confirm page
      router.push(`/onboarding/confirm?vaultId=${vaultId}`)
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <motion.div className="mx-auto max-w-[760px]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-sky-blue">Bước 1 / 2</p>
            <p className="mt-1 text-xs text-app-muted">Nhập nội dung để AI phân tích giọng văn</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-sky-blue" />
            <div className="h-2 w-2 rounded-full bg-muted-stone" />
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-muted-stone">
          <div className="h-1.5 w-1/2 rounded-full bg-sky-blue transition-all" />
        </div>
      </div>
      {loading ? (
        <AnalyzingLoader />
      ) : (
        <>
          <h1 className="whitespace-pre-line text-[48px] leading-none text-midnight-ink">Hãy cho AI biết{'\n'}bạn viết như thế nào.</h1>
          <p className="mt-5 text-dark-charcoal">Brand Vault là bộ nhớ giọng văn vĩnh cửu của bạn. Chỉ cần thiết lập 1 lần.</p>
          <Link
            href="/vaults"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-sky-blue hover:underline"
          >
            <Layers className="h-3.5 w-3.5" /> Xem các Brand Vault đã có
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {error && <div className="mt-4 rounded-md bg-vibrant-orange/10 p-3 text-sm text-vibrant-orange">{error}</div>}
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-app-muted">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-app-muted text-primary focus:ring-primary"
            />
            Phân tích lại (bỏ qua cache)
          </label>
          <div className="mt-10">
            <FlowSelector value={flow} onChange={setFlow} />
            {flow === 'content' ? <BrandVaultSetupText onSubmit={handleTextSubmit} /> : <BrandVaultSetupForm onSubmit={handleFormSubmit} />}
          </div>
        </>
      )}
    </motion.div>
  )
}

