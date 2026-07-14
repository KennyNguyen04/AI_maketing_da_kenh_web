'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Key, Copy, RefreshCw, Eye, EyeOff, CheckCircle2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function APITokenCard() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingToken, setLoadingToken] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [revokeMessage, setRevokeMessage] = useState<string | null>(null)

  useEffect(() => {
    loadExistingToken()
  }, [])

  async function loadExistingToken() {
    setLoadingToken(true)
    setError(null)
    try {
      const res = await fetch('/api/user/api-token/me')
      if (res.status === 401) {
        setHasToken(false)
        return
      }
      const data = await res.json()
      if (data.token) {
        setToken(data.token)
        setHasToken(true)
      } else {
        setHasToken(false)
      }
    } catch (e) {
      console.error('Failed to load token:', e)
      setError('Không tải được token. Vui lòng thử lại.')
    } finally {
      setLoadingToken(false)
    }
  }

  async function generateToken() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/api-token', { method: 'POST' })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      if (data.token) {
        setToken(data.token)
        setHasToken(true)
        setShowToken(true)
        setIsNew(true)
      }
    } catch (e) {
      console.error('Failed to generate token:', e)
      setError('Không tạo được token. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  async function copyToken() {
    if (!token) return
    await navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function revokeToken() {
    setRevoking(true)
    setError(null)
    setRevokeMessage(null)
    try {
      const res = await fetch('/api/user/api-token', { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Không thể thu hồi token')
      }
      setToken(null)
      setHasToken(false)
      setIsNew(false)
      setShowToken(false)
      setConfirmRevoke(false)
      setRevokeMessage('Đã thu hồi token. Extension đang dùng token cũ sẽ ngừng hoạt động ngay lập tức.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thu hồi token')
    } finally {
      setRevoking(false)
    }
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pure-canvas/20">
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
          {loadingToken ? (
            <div className="flex items-center gap-2 text-sm text-app-muted">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Đang tải token...
            </div>
          ) : error ? (
            <div className="rounded-card bg-vibrant-orange/5 border border-vibrant-orange/20 p-3">
              <p className="text-xs text-vibrant-orange">{error}</p>
              <button
                onClick={loadExistingToken}
                className="mt-2 text-xs font-medium text-vibrant-orange underline"
              >
                Thử lại
              </button>
            </div>
          ) : token ? (
            <div className="space-y-4">
              {isNew && (
                <div className="rounded-card bg-sunset-orange/10 border border-sunset-orange/25 p-3">
                  <p className="text-xs font-semibold text-sunset-orange">
                    Token mới vừa được tạo
                  </p>
                  <p className="mt-1 text-xs text-sunset-orange/80">
                    Token cũ (nếu có) đã bị vô hiệu hóa. Bạn có thể xem lại token này bất cứ lúc nào trên trang Settings.
                  </p>
                </div>
              )}

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
                      <CheckCircle2 className="h-4 w-4 text-forest-fern" />
                      Đã copy!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Token
                    </>
                  )}
                </Button>
                <span className="text-xs text-app-muted">
                  Token được lưu an toàn, có thể xem lại bất cứ lúc nào
                </span>
              </div>

              <div className="rounded-card bg-sky-blue/10 p-3">
                <p className="text-xs font-medium text-sky-blue">Hướng dẫn:</p>
                <ol className="mt-1.5 space-y-0.5 text-xs text-sky-blue/80">
                  <li>1. Copy token bên trên</li>
                  <li>2. Mở Chrome Extension popup</li>
                  <li>3. Dán token vào ô &ldquo;API Token&rdquo;</li>
                  <li>4. Bấm &ldquo;Lưu &amp; Kết nối&rdquo;</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-app-bg space-y-2">
                <Button
                  onClick={generateToken}
                  disabled={loading || revoking}
                  variant="outline"
                  className="w-full sm:w-auto border-forest-fern/40 text-forest-fern hover:bg-forest-fern/10"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Đang tạo lại...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Tạo lại token
                    </>
                  )}
                </Button>
                <p className="text-xs text-sunset-orange">
                  Tạo lại sẽ vô hiệu hóa token hiện tại. Extension đang dùng token cũ sẽ ngừng hoạt động.
                </p>

                <Button
                  onClick={() => setConfirmRevoke(true)}
                  disabled={loading || revoking}
                  variant="outline"
                  className="w-full sm:w-auto border-vibrant-orange/40 text-vibrant-orange hover:bg-vibrant-orange/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Thu hồi token
                </Button>
                <p className="text-xs text-vibrant-orange">
                  Thu hồi sẽ xóa vĩnh viễn token hiện tại. Bạn sẽ cần tạo token mới để dùng Extension.
                </p>
              </div>

              {revokeMessage ? (
                <div className="rounded-card bg-forest-fern/10 border border-forest-fern/25 p-3">
                  <p className="text-xs font-medium text-forest-fern">{revokeMessage}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-app-muted">
                Tạo API token để sử dụng với Chrome Extension.
                Token sẽ được lưu an toàn — bạn có thể xem lại bất cứ lúc nào.
              </p>

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
                    Tạo API Token
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        isOpen={confirmRevoke}
        title="Thu hồi API token?"
        message="Token sẽ bị xóa vĩnh viễn và Chrome Extension đang kết nối sẽ ngừng hoạt động ngay lập tức. Bạn sẽ cần tạo token mới nếu muốn dùng Extension trở lại."
        confirmText="Thu hồi vĩnh viễn"
        variant="danger"
        loading={revoking}
        onConfirm={revokeToken}
        onCancel={() => {
          setConfirmRevoke(false)
          setError(null)
        }}
      />
    </motion.div>
  )
}