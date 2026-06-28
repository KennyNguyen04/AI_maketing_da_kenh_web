'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Key, Copy, RefreshCw, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function APITokenCard() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    // Check if user already has a token
    checkToken()
  }, [])

  async function checkToken() {
    try {
      const res = await fetch('/api/user/api-token/check')
      const data = await res.json()
      setHasToken(data.has_token || false)
    } catch (e) {
      console.error('Failed to check token:', e)
    }
  }

  async function generateToken() {
    setLoading(true)
    try {
      const res = await fetch('/api/user/api-token', { method: 'POST' })
      const data = await res.json()
      
      if (data.token) {
        setToken(data.token)
        setHasToken(true)
      }
    } catch (e) {
      console.error('Failed to generate token:', e)
    }
    setLoading(false)
  }

  async function copyToken() {
    if (!token) return
    
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Key className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                API Token cho Extension
              </h2>
              <p className="mt-1 text-sm text-purple-100">
                Dùng token này để kết nối Chrome Extension với Amplify
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          {!token ? (
            <div className="space-y-4">
              {hasToken ? (
                <p className="text-sm text-app-muted">
                  Bạn đã có API token. Nhấn "Tạo Token mới" để thay thế.
                  Token cũ sẽ không còn hoạt động.
                </p>
              ) : (
                <p className="text-sm text-app-muted">
                  Tạo API token để sử dụng với Chrome Extension. Token chỉ hiển thị
                  <span className="font-medium text-midnight-ink"> một lần duy nhất</span>.
                </p>
              )}
              
              <Button
                onClick={generateToken}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    {hasToken ? 'Tạo Token mới' : 'Tạo API Token'}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <label className="mb-1.5 block text-xs font-medium text-app-muted">
                  API Token của bạn
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-card bg-app-bg px-3 py-2 text-sm font-mono text-midnight-ink">
                    {showToken ? token : '•'.repeat(Math.min(token.length, 32))}
                  </code>
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="rounded-card p-2 text-app-muted transition-colors hover:bg-app-bg hover:text-midnight-ink"
                    title={showToken ? 'Ẩn token' : 'Hiện token'}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToken}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Đã copy!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Token
                    </>
                  )}
                </Button>
                <span className="text-xs text-amber-600">
                  Token chỉ hiển thị 1 lần duy nhất
                </span>
              </div>

              <div className="rounded-card bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-800">Hướng dẫn:</p>
                <ol className="mt-1.5 space-y-0.5 text-xs text-blue-700">
                  <li>1. Copy token bên trên</li>
                  <li>2. Mở Chrome Extension popup</li>
                  <li>3. Dán token vào ô "API Token"</li>
                  <li>4. Bấm "Lưu &amp; Kết nối"</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
