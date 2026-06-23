'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AnalyzingLoader } from '@/features/brand-vault/components/AnalyzingLoader'
import { BrandVaultSetupForm } from '@/features/brand-vault/components/BrandVaultSetupForm'
import { BrandVaultSetupText } from '@/features/brand-vault/components/BrandVaultSetupText'
import { FlowSelector, OnboardingFlow } from '@/features/brand-vault/components/FlowSelector'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [flow, setFlow] = useState<OnboardingFlow>('content')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleTextSubmit(mode: string, value: string) {
    setLoading(true)
    setError('')
    
    try {
      const endpoint = mode === 'url' ? '/api/brand-vault/analyze-url' : '/api/brand-vault/analyze-text'
      const payload = mode === 'url' ? { url: value } : { text: value }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to start analysis')
      }

      const { vaultId } = await res.json()

      // Polling Supabase until is_active is true
      const interval = setInterval(async () => {
        const { data, error } = await supabase
          .from('brand_vaults')
          .select('is_active')
          .eq('id', vaultId)
          .single()

        if (error) {
          clearInterval(interval)
          setLoading(false)
          setError('Lỗi khi lấy dữ liệu: ' + error.message)
          return
        }

        if (data && data.is_active) {
          clearInterval(interval)
          router.push(`/onboarding/confirm?vaultId=${vaultId}`)
        }
      }, 2000) // Poll every 2 seconds

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
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create brand vault')
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
        <p className="text-sm font-medium text-sky-blue">Step 1 of 2 - Xây Brand Vault</p>
        <div className="mt-3 h-1 rounded-full bg-muted-stone"><div className="h-1 w-1/2 rounded-full bg-sky-blue" /></div>
      </div>
      {loading ? (
        <AnalyzingLoader />
      ) : (
        <>
          <h1 className="whitespace-pre-line text-[48px] leading-none text-midnight-ink">Hãy cho AI biết{'\n'}bạn viết như thế nào.</h1>
          <p className="mt-5 text-dark-charcoal">Brand Vault là bộ nhớ giọng văn vĩnh cửu của bạn. Chỉ cần thiết lập 1 lần.</p>
          {error && <div className="mt-4 rounded-md bg-vibrant-orange/10 p-3 text-sm text-vibrant-orange">{error}</div>}
          <div className="mt-10">
            <FlowSelector value={flow} onChange={setFlow} />
            {flow === 'content' ? <BrandVaultSetupText onSubmit={handleTextSubmit} /> : <BrandVaultSetupForm onSubmit={handleFormSubmit} />}
          </div>
        </>
      )}
    </motion.div>
  )
}

