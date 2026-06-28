'use client'

import { useState } from 'react'
import { Check, Edit2, MoreVertical, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Vault {
  id: string
  name: string
  display_name?: string | null
  is_active: boolean
  created_at: string
  voice_profile?: Record<string, unknown> | null
  system_prompt?: string | null
  source_type?: string | null
}

interface VaultManagementProps {
  initialVaults: Vault[]
}

export function VaultManagement({ initialVaults }: VaultManagementProps) {
  const [vaults, setVaults] = useState<Vault[]>(initialVaults)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const supabase = createClient()

  async function handleDelete(vaultId: string) {
    if (!confirm('Bạn có chắc muốn xóa vault này? Hành động này không thể hoàn tác.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('brand_vaults')
        .delete()
        .eq('id', vaultId)

      if (error) throw error

      setVaults((prev) => prev.filter((v) => v.id !== vaultId))
    } catch (error) {
      console.error('Error deleting vault:', error)
    }
  }

  async function handleEdit(vault: Vault) {
    setEditingId(vault.id)
    setEditName(vault.display_name || vault.name)
    setMenuOpenId(null)
  }

  async function handleSaveEdit(vaultId: string) {
    if (!editName.trim()) return

    try {
      const { error } = await supabase
        .from('brand_vaults')
        .update({
          name: editName.trim(),
          display_name: editName.trim(),
        })
        .eq('id', vaultId)

      if (error) throw error

      setVaults((prev) =>
        prev.map((v) =>
          v.id === vaultId
            ? { ...v, name: editName.trim(), display_name: editName.trim() }
            : v
        )
      )
      setEditingId(null)
      setEditName('')
    } catch (error) {
      console.error('Error updating vault:', error)
    }
  }

  async function handleSetActive(vaultId: string) {
    try {
      await supabase
        .from('brand_vaults')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      const { error } = await supabase
        .from('brand_vaults')
        .update({ is_active: true })
        .eq('id', vaultId)

      if (error) throw error

      setVaults((prev) => prev.map((v) => ({ ...v, is_active: v.id === vaultId })))
      setMenuOpenId(null)
    } catch (error) {
      console.error('Error setting active vault:', error)
    }
  }

  if (vaults.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-app-line bg-light-surface/50 p-8 text-center">
        <p className="text-sm text-app-muted">Chưa có Brand Vault nào.</p>
        <p className="mt-1 text-xs text-app-muted">
          Tạo vault mới để bắt đầu xây dựng giọng văn của bạn.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {vaults.map((vault) => {
        const label = vault.display_name || vault.name
        const isEditing = editingId === vault.id
        const isMenuOpen = menuOpenId === vault.id

        return (
          <div
            key={vault.id}
            className={`flex items-center justify-between rounded-lg border bg-pure-canvas p-4 transition ${
              vault.is_active ? 'border-primary/40 bg-primary/5' : 'border-app-line'
            }`}
          >
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md border border-app-line bg-pure-canvas px-3 py-1.5 text-sm text-midnight-ink focus:border-primary focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(vault.id)
                      if (e.key === 'Escape') {
                        setEditingId(null)
                        setEditName('')
                      }
                    }}
                  />
                  <button
                    onClick={() => handleSaveEdit(vault.id)}
                    className="rounded-md p-1.5 text-primary hover:bg-light-surface"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setEditName('')
                    }}
                    className="rounded-md p-1.5 text-app-muted hover:bg-light-surface"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="truncate text-sm font-medium text-midnight-ink">{label}</p>
                  <p className="mt-0.5 text-xs text-app-muted">
                    {vault.source_type === 'url' && 'Phân tích từ URL'}
                    {vault.source_type === 'text' && 'Phân tích từ text'}
                    {vault.source_type === 'form' && 'Tạo thủ công'}
                    {!vault.source_type && 'Brand Vault'}
                    {vault.is_active && ' · Đang hoạt động'}
                  </p>
                </>
              )}
            </div>

            <div className="ml-4 flex items-center gap-2">
              {!vault.is_active && !isEditing && (
                <button
                  onClick={() => handleSetActive(vault.id)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-light-surface"
                >
                  Kích hoạt
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setMenuOpenId(isMenuOpen ? null : vault.id)}
                  className="rounded-md p-1.5 text-app-muted hover:bg-light-surface"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-app-line bg-pure-canvas py-1 shadow-lg">
                    <button
                      onClick={() => handleEdit(vault)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-dark-charcoal hover:bg-light-surface"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Đổi tên
                    </button>
                    <button
                      onClick={() => handleDelete(vault.id)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-vibrant-orange hover:bg-light-surface"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
