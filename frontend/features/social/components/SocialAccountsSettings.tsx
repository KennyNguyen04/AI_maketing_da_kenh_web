'use client'

import { useEffect, useState } from 'react'
import { Facebook, Loader2, PlugZap, Trash2, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'
import type { SocialAccount } from '@/lib/types'

export function SocialAccountsSettings() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busyProvider, setBusyProvider] = useState<string | null>(null)

  async function loadAccounts() {
    setLoading(true)
    const res = await fetch('/api/social/accounts')
    const data = await res.json()
    setAccounts(data.accounts || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  async function connect(provider: 'x' | 'facebook') {
    setBusyProvider(provider)
    setMessage('')
    try {
      const res = await fetch(`/api/social/${provider}/connect`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không thể kết nối')
      window.location.href = data.authUrl
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
      setBusyProvider(null)
    }
  }

  async function disconnect(id: string) {
    await fetch(`/api/social/accounts/${id}`, { method: 'DELETE' })
    await loadAccounts()
  }

  const providers = [
    { id: 'x' as const, label: 'X', icon: Twitter, helper: 'Kết nối OAuth để có tùy chọn đăng sau bước preview.' },
    { id: 'facebook' as const, label: 'Facebook Page', icon: Facebook, helper: 'Đăng lên Page được cấp quyền hoặc dùng Copy + Open.' },
  ]

  return (
    <div className="space-y-4">
      {message ? <div className="rounded-card border border-sunset-orange/25 bg-sunset-orange/10 p-3 text-sm text-vibrant-orange">{message}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => {
          const Icon = provider.icon
          const connected = accounts.filter((account) => account.provider === provider.id)
          const busy = busyProvider === provider.id

          return (
            <Card key={provider.id} className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-card bg-hint-of-blue p-2.5 text-sky-blue">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base text-midnight-ink">{provider.label}</h2>
                      {connected.length > 0 ? <Tag color="green" label="Đã kết nối" /> : <Tag label="Chưa kết nối" />}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-app-muted">{provider.helper}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => connect(provider.id)} disabled={Boolean(busyProvider)}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                  Connect
                </Button>
              </div>

              <div className="space-y-2">
                {loading ? (
                  <p className="text-sm text-app-muted">Đang tải kết nối...</p>
                ) : connected.length > 0 ? connected.map((account) => (
                  <div key={account.id} className="flex items-center justify-between gap-3 rounded-card border border-app-line bg-app-bg px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-midnight-ink">{account.display_name}</p>
                      <p className="truncate text-xs text-app-muted">{account.account_type} · {account.external_account_id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => disconnect(account.id)}
                      className="rounded-nav p-2 text-app-muted transition hover:bg-sunset-orange/10 hover:text-vibrant-orange"
                      title="Ngắt kết nối"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )) : (
                  <p className="rounded-card border border-dashed border-app-line bg-app-bg p-4 text-sm text-app-muted">Chưa có tài khoản kết nối.</p>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
