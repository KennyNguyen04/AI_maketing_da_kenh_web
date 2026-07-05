'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Download,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Zap,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface ExtensionStatus {
  connected: boolean
  lastCheck: string | null
  registered_at?: string | null
  completed_today?: number
}

export function ExtensionSetupGuide() {
  const [status, setStatus] = useState<ExtensionStatus>({ connected: false, lastCheck: null })
  const [checking, setChecking] = useState(false)

  async function checkExtensionStatus() {
    setChecking(true)
    try {
      const res = await fetch('/api/extension/health')
      const data = await res.json()
      setStatus({
        connected: data.connected || false,
        lastCheck: new Date().toLocaleTimeString('vi-VN'),
      })
    } catch {
      setStatus({ connected: false, lastCheck: new Date().toLocaleTimeString('vi-VN') })
    }
    setChecking(false)
  }

  useEffect(() => {
    checkExtensionStatus()
    const interval = setInterval(checkExtensionStatus, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [])

  const steps = [
    {
      icon: Download,
      title: 'Mở Chrome Extensions',
      description: 'Truy cập chrome://extensions/ trên trình duyệt Chrome',
    },
    {
      icon: Shield,
      title: 'Bật Developer Mode',
      description: 'Click công tắc Developer mode ở góc phải trên cùng',
    },
    {
      icon: Globe,
      title: 'Load Extension',
      description: 'Click "Load unpacked" và chọn thư mục extension trong project',
    },
    {
      icon: Zap,
      title: 'Kết nối',
      description: 'Mở extension popup, nhập API URL và click kết nối',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-sky-blue to-regal-violet p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-pure-canvas">
                Chrome Extension cho Auto-Post
              </h2>
              <p className="mt-1 text-sm text-hint-of-blue">
                Tự động đăng bài lên Facebook, X, Threads, Instagram sau khi duyệt bản nháp
              </p>
            </div>
            <div className="flex items-center gap-2">
              {status.connected ? (
                <span className="flex items-center gap-1.5 rounded-badge bg-forest-fern/30 px-3 py-1 text-xs font-medium text-pure-canvas">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Đã kết nối
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-badge bg-sunset-orange/30 px-3 py-1 text-xs font-medium text-pure-canvas">
                  <XCircle className="h-3.5 w-3.5" />
                  Chưa kết nối
                </span>
              )}
              <button
                onClick={checkExtensionStatus}
                disabled={checking}
                className="rounded-full bg-pure-canvas/20 p-1.5 text-pure-canvas transition hover:bg-pure-canvas/30 disabled:opacity-50"
                title="Kiểm tra kết nối"
                aria-label="Kiểm tra kết nối"
              >
                <Loader2 className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* Extension Status Detail */}
          {status.lastCheck && (
            <div className="mb-4 space-y-1">
              <p className="text-xs text-app-muted">
                Kiểm tra lần cuối: {status.lastCheck}
              </p>
              {status.completed_today !== undefined && status.completed_today > 0 && (
                <p className="text-xs font-medium text-forest-fern">
                  Đã đăng {status.completed_today} bài hôm nay
                </p>
              )}
            </div>
          )}

          {/* Steps */}
          <div className="mb-6 space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-blue/10 text-sky-blue">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-midnight-ink">{step.title}</p>
                    <p className="text-xs text-app-muted">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 border-t border-app-line pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('chrome://extensions/', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Mở Chrome Extensions
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open('/extension/README.md', '_blank')}
            >
              Xem chi tiết
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
