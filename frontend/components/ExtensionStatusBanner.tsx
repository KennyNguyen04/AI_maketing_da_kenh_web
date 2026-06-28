'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Download, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ExtensionStatusBannerProps {
  hasToken: boolean
  isRegistered: boolean
}

export function ExtensionStatusBanner({ hasToken, isRegistered }: ExtensionStatusBannerProps) {
  // Don't show if already registered
  if (isRegistered) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-200/30" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-orange-200/20" />
        
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-900">
                Hoàn tất cài đặt để bắt đầu đăng bài
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                {!hasToken 
                  ? 'Bạn cần tạo API Token và cài đặt Chrome Extension để Amplify có thể tự động đăng bài lên mạng xã hội.'
                  : 'Cài đặt Chrome Extension và kết nối với Amplify để bắt đầu đăng bài tự động.'
                }
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!hasToken && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Chưa có API Token
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  Extension chưa kết nối
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Link href="/settings">
              <Button className="w-full gap-2 bg-amber-600 hover:bg-amber-700">
                <Download className="h-4 w-4" />
                Cài đặt ngay
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
