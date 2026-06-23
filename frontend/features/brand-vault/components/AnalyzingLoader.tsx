'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export function AnalyzingLoader() {
  const router = useRouter()

  useEffect(() => {
    const timer = window.setTimeout(() => router.push('/onboarding/confirm'), 4000)
    return () => window.clearTimeout(timer)
  }, [router])

  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-8 h-16 w-16 rounded-full border-4 border-muted-stone border-t-sky-blue [animation:spin_.8s_linear_infinite]" />
      <h2 className="text-[32px] text-midnight-ink">AI đang phân tích giọng văn...</h2>
      <p className="mt-3 text-dark-charcoal">Đang xây Brand Vault từ nội dung của bạn.</p>
      <div className="mx-auto mt-8 max-w-sm space-y-3 text-left text-sm text-sky-blue">
        {['Đọc nội dung bài viết', 'Phân tích tone và phong cách', 'Xây dựng Brand Vault...'].map((step, index) => (
          <motion.p key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + index }}>
            ✓ {step}
          </motion.p>
        ))}
      </div>
    </div>
  )
}
