'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Puzzle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

/**
 * Auto-link Chrome Extension với web app.
 *
 * Cơ chế:
 *  - Trang settings load → check `data-amplify-ext-installed` (do content script đặt)
 *  - Có API token trong sessionStorage → gửi qua `window.postMessage` cho extension
 *  - Extension nhận được → lưu vào chrome.storage.local
 *  - Nếu extension chưa cài → hiện hướng dẫn
 *
 * Token lưu ở sessionStorage bởi APITokenCard component, sẽ tự động
 * được extension nhận khi user mở trang Settings (sau khi cài extension).
 */

type ExtStatus = 'unknown' | 'installed' | 'missing'

export function ExtensionConnector() {
  const [status, setStatus] = useState<ExtStatus>('unknown')
  const [linked, setLinked] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [apiBase, setApiBase] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setApiBase(window.location.origin)

    // Detect extension presence via the attribute set by content scripts.
    // `data-amplify-ext-installed` is set by both inject.js and web-bridge.js.
    const checkInstalled = () => {
      const installed =
        document.documentElement.getAttribute('data-amplify-ext-installed') === 'true'
      setStatus(installed ? 'installed' : 'missing')
    }
    checkInstalled()

    // Re-check shortly after load — content scripts at document_idle can land
    // a beat after React hydrates.
    const t1 = setTimeout(checkInstalled, 800)
    const t2 = setTimeout(checkInstalled, 2500)

    // Listen for ack from extension when it stores our token.
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'AMPLIFY_TOKEN_SAVED') {
        setLinked(true)
        setConnecting(false)
      }
      if (e.data?.type === 'AMPLIFY_TOKEN_CLEARED') {
        setLinked(false)
      }
    }
    window.addEventListener('message', onMsg)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('message', onMsg)
    }
  }, [])

  async function handleConnect() {
    setError(null)
    setConnecting(true)

    // Read token from sessionStorage (set by APITokenCard)
    const token = sessionStorage.getItem('amplify_api_token')
    if (!token) {
      setError(
        'Chưa có API token trong phiên này. Vui lòng bấm "Tạo API Token" ở trên trước.'
      )
      setConnecting(false)
      return
    }

    window.postMessage(
      {
        type: 'AMPLIFY_SEND_TOKEN',
        token,
        api_base: apiBase,
      },
      window.location.origin
    )

    // If no ack after 3s assume extension not actually installed.
    setTimeout(() => {
      setConnecting((cur) => {
        if (cur) {
          setError(
            'Không nhận được phản hồi từ Extension. Hãy chắc chắn Extension đã được cài và đang bật.'
          )
        }
        return false
      })
    }, 3000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card>
        <div className="flex items-start gap-4 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-blue/15">
            <Puzzle className="h-5 w-5 text-sky-blue" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-midnight-ink">
              Kết nối Chrome Extension
            </h2>
            <p className="mt-1 text-sm text-app-muted">
              Liên kết Extension với tài khoản Amplify của bạn chỉ bằng một cú nhấp.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {status === 'unknown' && (
                <span className="inline-flex items-center gap-2 text-sm text-app-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang phát hiện Extension...
                </span>
              )}

              {status === 'missing' && (
                <span className="inline-flex items-center gap-2 text-sm text-vibrant-orange">
                  <AlertCircle className="h-4 w-4" />
                  Chưa phát hiện Extension. Hãy cài từ Chrome Web Store hoặc load unpacked.
                </span>
              )}

              {status === 'installed' && linked && (
                <span className="inline-flex items-center gap-2 text-sm text-forest-fern">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã liên kết thành công với Extension.
                </span>
              )}

              {status === 'installed' && !linked && (
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang liên kết...
                    </>
                  ) : (
                    <>🔗 Liên kết ngay</>
                  )}
                </Button>
              )}
            </div>

            {error && (
              <p className="mt-3 text-xs text-vibrant-orange">{error}</p>
            )}

            {status === 'installed' && linked && (
              <p className="mt-3 text-xs text-app-muted">
                Bạn có thể đóng tab này. Extension sẽ tự động chạy nền theo cài đặt của bạn.
              </p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}