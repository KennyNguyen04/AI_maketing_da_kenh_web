'use client'

import { useEffect, useState } from 'react'
import {
  Facebook,
  Linkedin,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Twitter,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tag } from '@/components/ui/Tag'
import { Toggle } from '@/components/ui/Toggle'

interface SocialTarget {
  id: string
  channel: string
  target_id: string
  target_type: 'group' | 'page' | 'profile'
  name: string
  url?: string
  description?: string
  member_count?: number
  is_active: boolean
  auto_post_enabled: boolean
  created_at: string
}

const CHANNELS = [
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-sky-blue' },
  { id: 'x', label: 'X (Twitter)', icon: X, color: 'text-midnight-ink' },
  { id: 'threads', label: 'Threads', icon: MessageCircle, color: 'text-dark-charcoal' },
  { id: 'instagram', label: 'Instagram', icon: Facebook, color: 'text-blush-pink' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-sky-blue' },
]

export function SocialTargetsSettings() {
  const [targets, setTargets] = useState<SocialTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formChannel, setFormChannel] = useState('facebook')
  const [formTargetId, setFormTargetId] = useState('')
  const [formTargetType, setFormTargetType] = useState<'group' | 'page' | 'profile'>('group')
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')

  async function loadTargets() {
    setLoading(true)
    try {
      const res = await fetch('/api/social/targets')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setTargets(data.targets || [])
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Không thể tải danh sách target' })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadTargets()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formTargetId || !formName) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/social/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: formChannel,
          targetId: formTargetId,
          targetType: formTargetType,
          name: formName,
          url: formUrl || undefined,
          autoPost: false,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Không thể thêm target')
      }

      setMessage({ type: 'success', text: 'Đã thêm target thành công' })
      setDialogOpen(false)
      resetForm()
      loadTargets()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : String(err) })
    }

    setSubmitting(false)
  }

  async function handleToggleAutoPost(targetId: string, currentValue: boolean) {
    try {
      const res = await fetch(`/api/social/targets/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_post_enabled: !currentValue }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      loadTargets()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Không thể cập nhật' })
    }
  }

  async function handleDelete(targetId: string) {
    if (!confirm('Bạn có chắc muốn xóa target này?')) return

    try {
      const res = await fetch(`/api/social/targets/${targetId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      loadTargets()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Không thể xóa target' })
    }
  }

  function resetForm() {
    setFormChannel('facebook')
    setFormTargetId('')
    setFormTargetType('group')
    setFormName('')
    setFormUrl('')
  }

  // Group targets by channel
  const grouped = CHANNELS.reduce((acc, channel) => {
    acc[channel.id] = targets.filter((t) => t.channel === channel.id)
    return acc
  }, {} as Record<string, SocialTarget[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-midnight-ink">Nền tảng đích (Targets)</h2>
          <p className="mt-1 text-sm text-app-muted">
            Thêm Groups, Pages, Accounts để extension tự động đăng bài.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Thêm Target
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Thêm Target mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-midnight-ink">Nền tảng</label>
                <Select
                  value={formChannel}
                  onChange={(e) => setFormChannel(e.target.value)}
                  options={CHANNELS.map((c) => ({ value: c.id, label: c.label }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-midnight-ink">Loại</label>
                <Select
                  value={formTargetType}
                  onChange={(e) => setFormTargetType(e.target.value as 'group' | 'page' | 'profile')}
                  options={[
                    { value: 'group', label: 'Nhóm (Group)' },
                    { value: 'page', label: 'Trang (Page)' },
                    { value: 'profile', label: 'Cá nhân (Profile)' },
                  ]}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-midnight-ink">Tên</label>
                <Input
                  placeholder="VD: Marketing Việt Nam"
                  value={formName}
                  onChange={(val) => setFormName(val)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-midnight-ink">ID / Slug</label>
                <Input
                  placeholder="VD: 123456789 hoặc marketing-viet-nam"
                  value={formTargetId}
                  onChange={(val) => setFormTargetId(val)}
                  required
                />
                <p className="text-xs text-app-muted">
                  ID từ URL: facebook.com/groups/<strong>123456789</strong>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-midnight-ink">URL (tùy chọn)</label>
                <Input
                  placeholder="https://facebook.com/groups/..."
                  value={formUrl}
                  onChange={(val) => setFormUrl(val)}
                />
              </div>

              {message && message.type === 'error' && (
                <p className="text-sm text-vibrant-orange">{message.text}</p>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Đang thêm...' : 'Thêm Target'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {message && message.type === 'success' && (
        <div className="rounded-card border border-forest-fern/30 bg-forest-fern/10 p-3 text-sm text-forest-fern">
          {message.text}
        </div>
      )}

      {/* Channel Sections */}
      <div className="space-y-4">
        {CHANNELS.map((channel) => {
          const Icon = channel.icon
          const items = grouped[channel.id] || []
          const hasItems = items.length > 0

          return (
            <Card key={channel.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-card bg-hint-of-blue p-2 ${channel.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-midnight-ink">{channel.label}</h3>
                  <p className="text-xs text-app-muted">
                    {hasItems ? `${items.length} target` : 'Chưa có target'}
                  </p>
                </div>
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadTargets}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {loading ? (
                <p className="text-sm text-app-muted">Đang tải...</p>
              ) : hasItems ? (
                <div className="space-y-2">
                  {items.map((target) => (
                    <div
                      key={target.id}
                      className="flex items-center justify-between gap-3 rounded-card border border-app-line bg-app-bg px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-midnight-ink">
                            {target.name}
                          </p>
                          <Tag
                            color={target.target_type === 'group' ? 'blue' : 'purple'}
                            label={target.target_type === 'group' ? 'Group' : target.target_type === 'page' ? 'Page' : 'Profile'}
                          />
                          {target.auto_post_enabled && (
                            <Tag color="green" label="Auto" />
                          )}
                        </div>
                        <p className="truncate text-xs text-app-muted">
                          ID: {target.target_id}
                          {target.member_count ? ` · ${target.member_count.toLocaleString()} thành viên` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={target.auto_post_enabled}
                          onChange={() => handleToggleAutoPost(target.id, target.auto_post_enabled)}
                          label="Auto đăng"
                        />
                        <button
                          type="button"
                          onClick={() => handleDelete(target.id)}
                          className="rounded-nav p-2 text-app-muted transition hover:bg-sunset-orange/10 hover:text-vibrant-orange"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-card border border-dashed border-app-line bg-app-bg p-4 text-sm text-app-muted">
                  Chưa có {channel.label} target nào.
                </p>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
