'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, Facebook, Fingerprint, Linkedin, Link2, Plus, Twitter } from 'lucide-react'
import { clsx } from 'clsx'
import { Channel } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { Toast } from '@/components/ui/Toast'
import { JobStatusPoller } from './JobStatusPoller'
import { createClient } from '@/lib/supabase/client'

const channelOptions: { id: Channel; icon: typeof Linkedin; label: string; description: string }[] = [
  { id: 'linkedin_post', icon: Linkedin, label: 'LinkedIn Post', description: 'Bài ngắn 150-300 từ' },
  { id: 'linkedin_thread', icon: Linkedin, label: 'LinkedIn Thread', description: 'Chuỗi 5-7 ý liên tiếp' },
  { id: 'facebook', icon: Facebook, label: 'Facebook Page', description: 'Bài kể chuyện 200-400 từ' },
  { id: 'twitter', icon: Twitter, label: 'X', description: 'Bản ngắn dưới 280 ký tự' },
]

interface Vault {
  id: string
  name: string
  display_name?: string | null
  is_active: boolean
}

export function NewJobForm() {
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('source_type') || 'text'
  const initialUrl = searchParams.get('url') || ''
  const initialTitle = searchParams.get('title') || ''
  const initialChannelsParam = searchParams.get('channels')
  const initialChannels = initialChannelsParam
    ? (initialChannelsParam.split(',') as Channel[])
    : channelOptions.map((item) => item.id)

  const [mode, setMode] = useState(initialMode)
  const [content, setContent] = useState('')
  const [url, setUrl] = useState(initialUrl)
  const [title, setTitle] = useState(initialTitle)
  const [channels, setChannels] = useState<Channel[]>(initialChannels)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [vaultId, setVaultId] = useState<string | null>(null)
  const [vaults, setVaults] = useState<Vault[]>([])
  const [isLoadingVault, setIsLoadingVault] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')

  const supabase = createClient()

  useEffect(() => {
    if (mode === 'text') {
      const savedRetryContent = sessionStorage.getItem('amplify_retry_content')
      if (savedRetryContent) {
        setContent(savedRetryContent)
        sessionStorage.removeItem('amplify_retry_content')
      }
    }
  }, [mode])

  useEffect(() => {
    async function loadVault() {
      setIsLoadingVault(true)
      const { data } = await supabase
        .from('brand_vaults')
        .select('id, name, display_name, is_active')
        .order('created_at', { ascending: false })

      if (data && data.length > 0) {
        setVaults(data)
        const activeVault = data.find((item) => item.is_active) || data[0]
        setVaultId(activeVault.id)
      }
      setIsLoadingVault(false)
    }
    loadVault()
  }, [supabase])

  const activeVault = vaults.find((item) => item.id === vaultId) || vaults[0]

  const wordCount = useMemo(() => content.trim().split(/\s+/).filter(Boolean).length, [content])

  function toggleChannel(channel: Channel) {
    setChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel])
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!vaultId) {
      const msg = 'Vui lòng chọn Brand Vault trước khi tạo nội dung.'
      setError(msg)
      setToastMessage(msg)
      setToastType('error')
      setToastVisible(true)
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: mode,
          source_content: mode === 'url' ? url : content,
          channels,
          brand_vault_id: vaultId,
          title: title ? title : undefined,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Không thể tạo job')

      setJobId(data.jobId)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setToastMessage(msg)
      setToastType('error')
      setToastVisible(true)
      setLoading(false)
    }
  }

  if (jobId) {
    return <JobStatusPoller jobId={jobId} />
  }

  return (
    <form onSubmit={submit} className="max-w-[820px] space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-card bg-hint-of-blue text-sky-blue">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-midnight-ink">Brand Vault</p>
              {isLoadingVault ? (
                <p className="text-xs text-app-muted">Đang kiểm tra cấu hình...</p>
              ) : activeVault ? (
                <p className="text-xs text-app-muted">{activeVault.display_name || activeVault.name} đang hoạt động</p>
              ) : (
                <p className="text-xs text-vibrant-orange">Chưa có Brand Vault để tạo nội dung.</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {vaults.length > 0 ? (
              <select
                value={vaultId ?? ''}
                onChange={(e) => setVaultId(e.target.value || null)}
                className="rounded-badge border border-app-line bg-pure-canvas px-3 py-1.5 text-sm text-midnight-ink"
              >
                {vaults.map((vault) => (
                  <option key={vault.id} value={vault.id}>
                    {vault.display_name || vault.name}{vault.is_active ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
            ) : null}
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-button border border-app-line bg-pure-canvas px-3 py-2 text-sm font-medium leading-none text-midnight-ink transition hover:border-sky-blue/40 hover:bg-hint-of-blue/35"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tạo vault mới
            </Link>
          </div>
        </div>
      </Card>

      {error ? <div className="rounded-card border border-sunset-orange/20 bg-sunset-orange/10 p-3 text-sm text-vibrant-orange">{error}</div> : null}

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-medium text-midnight-ink">Nội dung gốc</p>
          <p className="mt-1 text-xs text-app-muted">Dán nội dung dài hoặc nhập URL công khai.</p>
        </div>
        <Tabs
          items={[{ id: 'text', label: 'Dán text' }, { id: 'url', label: 'Từ URL' }]}
          activeId={mode}
          onChange={setMode}
        />
        {mode === 'text' ? (
          <>
            <Input type="textarea" rows={9} placeholder="Dán bài blog, báo cáo hoặc script video vào đây..." value={content} onChange={setContent} />
            <p className="text-xs text-app-muted">{wordCount} từ</p>
          </>
        ) : (
          <Input
            type="url"
            placeholder="https://yourblog.com/post"
            value={url}
            onChange={setUrl}
            helper="Chỉ hỗ trợ URL công khai. Trang yêu cầu đăng nhập sẽ không hoạt động."
          />
        )}
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-medium text-midnight-ink">Kênh cần tạo</p>
          <p className="mt-1 text-xs text-app-muted">Có thể chọn nhiều kênh trong cùng một lần tạo.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {channelOptions.map((channel) => {
            const Icon = channel.icon
            const selected = channels.includes(channel.id)
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => toggleChannel(channel.id)}
                className={clsx(
                  'relative flex items-start gap-3 rounded-card border bg-pure-canvas p-4 text-left transition hover:border-sky-blue/40 hover:bg-hint-of-blue/20',
                  selected ? 'border-sky-blue bg-hint-of-blue/25' : 'border-app-line',
                )}
              >
                <Icon className="mt-0.5 h-5 w-5 text-sky-blue" />
                <span>
                  <span className="block text-sm font-medium text-midnight-ink">{channel.label}</span>
                  <span className="mt-1 block text-xs text-app-muted">{channel.description}</span>
                </span>
                {selected ? <Check className="absolute right-3 top-3 h-4 w-4 text-sky-blue" /> : null}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="space-y-4">
        <Input
          label="Tiêu đề tùy chọn"
          placeholder="Để trống nếu muốn AI tự lấy từ nội dung"
          value={title}
          onChange={setTitle}
        />
        <Button type="submit" size="lg" className="w-full" disabled={channels.length === 0 || loading || !vaultId}>
          {loading ? 'Đang gửi...' : (
            <>
              <Link2 className="h-4 w-4" /> Tạo bản nháp
            </>
          )}
        </Button>
      </Card>

      <Toast
        type={toastType}
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </form>
  )
}
