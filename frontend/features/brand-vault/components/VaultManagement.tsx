'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CalendarDays,
  Check,
  Edit2,
  ExternalLink,
  FileText,
  Fingerprint,
  Globe2,
  Loader2,
  MoreVertical,
  PencilLine,
  Plus,
  Power,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'
import { Tabs } from '@/components/ui/Tabs'
import { Toast } from '@/components/ui/Toast'

export interface Vault {
  id: string
  name: string
  display_name?: string | null
  is_active: boolean
  created_at: string
  voice_profile?: Record<string, unknown> | null
  system_prompt?: string | null
  source_type?: string | null
  raw_input?: string | null
  error_message?: string | null
}

interface VaultManagementProps {
  initialVaults: Vault[]
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'error'

const sourceLabels: Record<string, { label: string; icon: typeof Globe2; tone: string }> = {
  url: { label: 'Phân tích từ URL', icon: Globe2, tone: 'blue' },
  text: { label: 'Phân tích từ văn bản', icon: FileText, tone: 'green' },
  form: { label: 'Tạo thủ công', icon: PencilLine, tone: 'orange' },
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function summarizeVoice(profile: unknown): { tone: string; topics: string } | null {
  if (!profile || typeof profile !== 'object') return null
  const data = profile as Record<string, unknown>
  const tone = Array.isArray(data.tone) ? (data.tone as unknown[]).filter(Boolean).slice(0, 3).join(' · ') : ''
  const topics = Array.isArray(data.topics) ? (data.topics as unknown[]).filter(Boolean).slice(0, 3).join(' · ') : ''
  return { tone, topics }
}

export function VaultManagement({ initialVaults }: VaultManagementProps) {
  const router = useRouter()
  const [vaults, setVaults] = useState<Vault[]>(initialVaults)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const supabase = createClient()

  const stats = useMemo(() => {
    const total = vaults.length
    const active = vaults.filter((v) => v.is_active).length
    const withVoice = vaults.filter((v) => v.voice_profile).length
    const failed = vaults.filter((v) => v.error_message && !v.voice_profile).length
    return { total, active, withVoice, failed }
  }, [vaults])

  const filteredVaults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return vaults
      .filter((v) => {
        if (statusFilter === 'active' && !v.is_active) return false
        if (statusFilter === 'inactive' && v.is_active) return false
        if (statusFilter === 'error' && !(v.error_message && !v.voice_profile)) return false
        if (q) {
          const haystack = `${v.display_name || ''} ${v.name || ''} ${v.source_type || ''}`.toLowerCase()
          if (!haystack.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [vaults, statusFilter, searchQuery])

  function showToast(type: 'success' | 'error' | 'info', message: string) {
    setToast({ type, message })
  }

  async function handleReanalyze(vault: Vault) {
    setMenuOpenId(null)
    if (!vault.source_type || vault.source_type === 'form') {
      showToast('info', 'Vault tạo thủ công không cần phân tích lại.')
      return
    }
    if (!vault.raw_input) {
      showToast('error', 'Không tìm thấy nội dung gốc để phân tích lại.')
      return
    }

    setReanalyzingId(vault.id)
    try {
      const payload: Record<string, unknown> = { forceRefresh: true }
      if (vault.source_type === 'url') payload.url = vault.raw_input
      if (vault.source_type === 'text') payload.text = vault.raw_input

      const endpoint =
        vault.source_type === 'url'
          ? '/api/brand-vault/analyze-url'
          : '/api/brand-vault/analyze-text'

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || 'Failed to reanalyze')
      }

      const data = await res.json()
      // Optimistically mark the vault as inactive while the worker re-runs.
      setVaults((prev) =>
        prev.map((v) =>
          v.id === vault.id ? { ...v, is_active: false, error_message: null } : v,
        ),
      )
      showToast('info', 'Đang phân tích lại giọng văn. Bạn có thể đợi hoặc quay lại sau.')

      // If we got a vaultId back (which we will from analyze-url/text), the
      // existing polling on the onboarding page will pick it up. For the
      // /vaults page we just leave the card in "analyzing" state — the user
      // will see it become active again on a fresh page load.
      if (data?.vaultId) {
        // Trigger a router refresh so server component re-queries on the
        // next navigation, but don't block on it.
        setTimeout(() => router.refresh(), 1500)
      }
    } catch (error) {
      console.error('Reanalyze error:', error)
      showToast('error', 'Lỗi khi phân tích lại: ' + (error instanceof Error ? error.message : 'Unknown'))
    } finally {
      setReanalyzingId(null)
    }
  }

  async function handleDelete(vault: Vault) {
    setMenuOpenId(null)
    if (!confirm(`Xóa Brand Vault "${vault.display_name || vault.name}"? Hành động này không thể hoàn tác.`)) {
      return
    }

    setDeletingId(vault.id)
    try {
      const { error } = await supabase
        .from('brand_vaults')
        .delete()
        .eq('id', vault.id)

      if (error) throw error

      setVaults((prev) => prev.filter((v) => v.id !== vault.id))
      showToast('success', 'Đã xóa Brand Vault.')
    } catch (error) {
      console.error('Error deleting vault:', error)
      showToast('error', 'Không thể xóa Brand Vault.')
    } finally {
      setDeletingId(null)
    }
  }

  function handleEdit(vault: Vault) {
    setEditingId(vault.id)
    setEditName(vault.display_name || vault.name)
    setMenuOpenId(null)
  }

  async function handleSaveEdit(vaultId: string) {
    const trimmed = editName.trim()
    if (!trimmed) return

    try {
      const { error } = await supabase
        .from('brand_vaults')
        .update({
          name: trimmed,
          display_name: trimmed,
        })
        .eq('id', vaultId)

      if (error) throw error

      setVaults((prev) =>
        prev.map((v) =>
          v.id === vaultId
            ? { ...v, name: trimmed, display_name: trimmed }
            : v,
        ),
      )
      setEditingId(null)
      setEditName('')
      showToast('success', 'Đã đổi tên Brand Vault.')
    } catch (error) {
      console.error('Error updating vault:', error)
      showToast('error', 'Không thể đổi tên.')
    }
  }

  async function handleSetActive(vault: Vault) {
    setMenuOpenId(null)
    try {
      // Deactivate all vaults first (single-user scope), then activate the
      // chosen one. Wrapped in a small loop instead of two round-trips
      // for clarity; performance is fine for the user's small vault set.
      await supabase
        .from('brand_vaults')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      const { error } = await supabase
        .from('brand_vaults')
        .update({ is_active: true })
        .eq('id', vault.id)

      if (error) throw error

      setVaults((prev) => prev.map((v) => ({ ...v, is_active: v.id === vault.id })))
      showToast('success', `Đã kích hoạt "${vault.display_name || vault.name}".`)
    } catch (error) {
      console.error('Error setting active vault:', error)
      showToast('error', 'Không thể kích hoạt Brand Vault.')
    }
  }

  const tabs = [
    { id: 'all', label: 'Tất cả', badge: stats.total ? String(stats.total) : undefined },
    { id: 'active', label: 'Đang hoạt động', badge: stats.active ? String(stats.active) : undefined },
    { id: 'inactive', label: 'Không hoạt động', badge: stats.total - stats.active ? String(stats.total - stats.active) : undefined },
    { id: 'error', label: 'Lỗi', badge: stats.failed ? String(stats.failed) : undefined },
  ]

  return (
    <div className="space-y-5">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          isVisible
          onClose={() => setToast(null)}
        />
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-app-muted">Tổng số</p>
          <p className="mt-2 text-2xl font-semibold text-midnight-ink">{stats.total}</p>
          <p className="mt-1 text-xs text-app-muted">Brand Vault</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-app-muted">Đang hoạt động</p>
          <p className="mt-2 text-2xl font-semibold text-deep-moss">{stats.active}</p>
          <p className="mt-1 text-xs text-app-muted">Dùng để tạo nội dung</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-app-muted">Có giọng văn</p>
          <p className="mt-2 text-2xl font-semibold text-sky-blue">{stats.withVoice}</p>
          <p className="mt-1 text-xs text-app-muted">Đã phân tích xong</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-app-muted">Cần xử lý</p>
          <p className={clsx('mt-2 text-2xl font-semibold', stats.failed ? 'text-vibrant-orange' : 'text-app-muted')}>
            {stats.failed}
          </p>
          <p className="mt-1 text-xs text-app-muted">Phân tích bị lỗi</p>
        </Card>
      </div>

      {/* Filter / search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          items={tabs}
          activeId={statusFilter}
          onChange={(id) => setStatusFilter(id as StatusFilter)}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc nguồn..."
            className="w-full rounded-button border border-app-line bg-pure-canvas py-2 pl-9 pr-3 text-sm text-midnight-ink placeholder:text-app-muted focus:border-sky-blue focus:outline-none md:w-72"
          />
        </div>
      </div>

      {/* Empty / list */}
      {vaults.length === 0 ? (
        <EmptyState />
      ) : filteredVaults.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-app-muted">Không có vault nào khớp bộ lọc.</p>
          <button
            onClick={() => {
              setStatusFilter('all')
              setSearchQuery('')
            }}
            className="mt-3 text-sm font-medium text-sky-blue hover:underline"
          >
            Xoá bộ lọc
          </button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredVaults.map((vault, index) => (
            <VaultCard
              key={vault.id}
              vault={vault}
              isEditing={editingId === vault.id}
              editName={editName}
              isMenuOpen={menuOpenId === vault.id}
              isReanalyzing={reanalyzingId === vault.id}
              isDeleting={deletingId === vault.id}
              onToggleMenu={() => setMenuOpenId(menuOpenId === vault.id ? null : vault.id)}
              onStartEdit={() => handleEdit(vault)}
              onCancelEdit={() => {
                setEditingId(null)
                setEditName('')
              }}
              onSaveEdit={() => handleSaveEdit(vault.id)}
              onEditNameChange={setEditName}
              onSetActive={() => handleSetActive(vault)}
              onReanalyze={() => handleReanalyze(vault)}
              onDelete={() => handleDelete(vault)}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed border-app-line bg-light-surface/50 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-hint-of-blue text-sky-blue">
        <Fingerprint className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-midnight-ink">Chưa có Brand Vault nào</h3>
      <p className="mt-2 max-w-md mx-auto text-sm leading-6 text-app-muted">
        Brand Vault là bộ nhớ giọng văn vĩnh cửu. Tạo vault đầu tiên để AI tái sử dụng giọng văn của bạn
        cho mọi kênh.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/onboarding">
          <Button>
            <Plus className="h-4 w-4" /> Tạo Brand Vault đầu tiên
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="white">Về Dashboard</Button>
        </Link>
      </div>
    </Card>
  )
}

interface VaultCardProps {
  vault: Vault
  isEditing: boolean
  editName: string
  isMenuOpen: boolean
  isReanalyzing: boolean
  isDeleting: boolean
  onToggleMenu: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditNameChange: (value: string) => void
  onSetActive: () => void
  onReanalyze: () => void
  onDelete: () => void
  index: number
}

function VaultCard({
  vault,
  isEditing,
  editName,
  isMenuOpen,
  isReanalyzing,
  isDeleting,
  onToggleMenu,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditNameChange,
  onSetActive,
  onReanalyze,
  onDelete,
  index,
}: VaultCardProps) {
  const label = vault.display_name || vault.name
  const source = sourceLabels[vault.source_type || ''] || {
    label: 'Brand Vault',
    icon: Fingerprint,
    tone: 'blue',
  }
  const SourceIcon = source.icon
  const summary = summarizeVoice(vault.voice_profile)
  const hasVoice = Boolean(vault.voice_profile)
  const hasError = Boolean(vault.error_message) && !hasVoice
  const isProcessing = !hasVoice && !hasError && (vault.source_type === 'url' || vault.source_type === 'text')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
    >
      <Card
        className={clsx(
          'relative flex h-full flex-col gap-4 p-5 transition',
          vault.is_active && 'border-sky-blue/50 bg-hint-of-blue/30 shadow-sm',
          hasError && 'border-sunset-orange/35',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={clsx(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-card',
                vault.is_active ? 'bg-sky-blue text-pure-canvas' : 'bg-hint-of-blue text-sky-blue',
              )}
            >
              <Fingerprint className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveEdit()
                      if (e.key === 'Escape') onCancelEdit()
                    }}
                    className="flex-1 rounded-md border border-app-line bg-pure-canvas px-3 py-1.5 text-sm text-midnight-ink focus:border-sky-blue focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={onSaveEdit}
                    className="rounded-md p-1.5 text-deep-moss hover:bg-light-surface"
                    aria-label="Lưu"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    className="rounded-md p-1.5 text-app-muted hover:bg-light-surface"
                    aria-label="Hủy"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <h3 className="truncate text-base font-semibold text-midnight-ink">{label}</h3>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {vault.is_active && <Tag color="green" label="Đang hoạt động" />}
                {hasError && <Tag color="red" label="Phân tích lỗi" />}
                {isProcessing && <Tag color="blue" label="Đang phân tích" />}
                {hasVoice && !vault.is_active && <Tag color="blue" label="Có giọng văn" />}
              </div>
            </div>
          </div>

          {!isEditing && (
            <div className="relative">
              <button
                type="button"
                onClick={onToggleMenu}
                disabled={isReanalyzing || isDeleting}
                className="rounded-md p-1.5 text-app-muted transition hover:bg-light-surface hover:text-midnight-ink disabled:opacity-40"
                aria-label="Mở menu"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-app-line bg-pure-canvas py-1 shadow-lg">
                  {(vault.source_type === 'url' || vault.source_type === 'text') && (
                    <button
                      type="button"
                      onClick={onReanalyze}
                      disabled={isReanalyzing}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-dark-charcoal hover:bg-light-surface disabled:opacity-50"
                    >
                      {isReanalyzing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Phân tích lại
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onStartEdit}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-dark-charcoal hover:bg-light-surface"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Đổi tên
                  </button>
                  {hasVoice && !vault.is_active && (
                    <button
                      type="button"
                      onClick={onSetActive}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-sky-blue hover:bg-light-surface"
                    >
                      <Power className="h-3.5 w-3.5" />
                      Đặt làm đang hoạt động
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-vibrant-orange hover:bg-light-surface disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Xóa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source + meta */}
        <div className="flex items-center gap-2 text-xs text-app-muted">
          <SourceIcon className="h-3.5 w-3.5" />
          <span>{source.label}</span>
          <span>·</span>
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{formatDate(vault.created_at)}</span>
        </div>

        {/* Voice summary */}
        {hasVoice ? (
          <div className="space-y-1.5 rounded-card border border-app-line bg-app-bg/60 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-app-muted">Giọng văn</p>
            {summary?.tone && (
              <p className="text-sm text-midnight-ink">
                <span className="text-app-muted">Tone: </span>
                <span className="font-medium">{summary.tone}</span>
              </p>
            )}
            {summary?.topics && (
              <p className="text-sm text-midnight-ink">
                <span className="text-app-muted">Chủ đề: </span>
                <span className="font-medium">{summary.topics}</span>
              </p>
            )}
          </div>
        ) : hasError ? (
          <div className="space-y-2 rounded-card border border-sunset-orange/30 bg-sunset-orange/5 p-3">
            <div className="flex items-center gap-2 text-vibrant-orange">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-xs font-medium">Phân tích thất bại</p>
            </div>
            <p className="line-clamp-3 text-xs text-dark-charcoal">{vault.error_message}</p>
          </div>
        ) : isProcessing ? (
          <div className="flex items-center gap-2 rounded-card border border-app-line bg-app-bg/60 p-3 text-xs text-app-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Đang chờ worker phân tích xong...</span>
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-app-line bg-app-bg/40 p-3 text-xs text-app-muted">
            Tạo thủ công — chưa có voice profile.
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {vault.is_active ? (
            <Link href="/dashboard/new" className="flex-1">
              <Button size="sm" className="w-full">
                <Sparkles className="h-3.5 w-3.5" /> Tạo nội dung với vault này
              </Button>
            </Link>
          ) : hasVoice ? (
            <Button variant="ghost" size="sm" onClick={onSetActive} className="flex-1">
              <Power className="h-3.5 w-3.5" /> Kích hoạt
            </Button>
          ) : vault.source_type === 'url' || vault.source_type === 'text' ? (
            <Button
              variant="white"
              size="sm"
              onClick={onReanalyze}
              disabled={isReanalyzing}
              className="flex-1"
            >
              {isReanalyzing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Thử phân tích lại
            </Button>
          ) : (
            <Link href="/onboarding" className="flex-1">
              <Button variant="white" size="sm" className="w-full">
                <Plus className="h-3.5 w-3.5" /> Tạo voice cho vault này
              </Button>
            </Link>
          )}
          {hasVoice && (
            <Link href={`/onboarding/confirm?vaultId=${vault.id}`}>
              <Button variant="white" size="sm">
                <ExternalLink className="h-3.5 w-3.5" /> Xem chi tiết
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </motion.div>
  )
}