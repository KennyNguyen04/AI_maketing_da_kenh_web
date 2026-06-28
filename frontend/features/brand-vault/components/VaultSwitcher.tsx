'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'

interface Vault {
  id: string
  name: string
  display_name?: string | null
  is_active: boolean
  created_at: string
}

export function VaultSwitcher() {
  const [vaults, setVaults] = useState<Vault[]>([])
  const [activeVault, setActiveVault] = useState<Vault | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newVaultName, setNewVaultName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadVaults()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadVaults() {
    try {
      const { data, error } = await supabase
        .from('brand_vaults')
        .select('id, name, display_name, is_active, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setVaults(data || [])
      setActiveVault(data?.find((v) => v.is_active) || data?.[0] || null)
    } catch (error) {
      console.error('Error loading vaults:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSwitch(vault: Vault) {
    try {
      // Deactivate all vaults
      await supabase
        .from('brand_vaults')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      // Activate selected vault
      const { error } = await supabase
        .from('brand_vaults')
        .update({ is_active: true })
        .eq('id', vault.id)

      if (error) throw error

      setActiveVault(vault)
      setVaults((prev) => prev.map((v) => ({ ...v, is_active: v.id === vault.id })))
      setIsOpen(false)
    } catch (error) {
      console.error('Error switching vault:', error)
    }
  }

  async function handleCreateVault() {
    if (!newVaultName.trim()) return

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from('brand_vaults')
        .insert({
          name: newVaultName.trim(),
          display_name: newVaultName.trim(),
          is_active: false,
          voice_profile: {},
          system_prompt: '',
          source_type: 'form',
        })
        .select()
        .single()

      if (error) throw error

      setVaults((prev) => [data, ...prev])
      setNewVaultName('')
      setIsOpen(false)
    } catch (error) {
      console.error('Error creating vault:', error)
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-app-line bg-pure-canvas px-3 py-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-app-muted">Đang tải vaults...</span>
      </div>
    )
  }

  if (vaults.length === 0) {
    return null
  }

  const displayName = activeVault?.display_name || activeVault?.name || 'No vault'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-app-line bg-pure-canvas px-3 py-2 text-sm font-medium text-midnight-ink transition hover:border-sky-blue/40 hover:bg-hint-of-blue/20"
      >
        <span className="max-w-[200px] truncate">{displayName}</span>
        <ChevronDown className="h-4 w-4 text-app-muted" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-app-line bg-pure-canvas py-1 shadow-lg">
          {vaults.map((vault) => {
            const label = vault.display_name || vault.name
            const isActive = activeVault?.id === vault.id
            return (
              <button
                key={vault.id}
                onClick={() => handleSwitch(vault)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-light-surface"
              >
                <span className={`max-w-[180px] truncate ${isActive ? 'font-medium text-midnight-ink' : 'text-dark-charcoal'}`}>
                  {label}
                </span>
                {isActive && <Check className="h-4 w-4 text-primary" />}
              </button>
            )
          })}

          <div className="border-t border-app-line pt-1 mt-1">
            <div className="px-3 py-2">
              <Input
                placeholder="Tên vault mới..."
                value={newVaultName}
                onChange={(val) => setNewVaultName(val)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateVault()
                  }
                }}
              />
            </div>
            <button
              onClick={handleCreateVault}
              disabled={!newVaultName.trim() || isCreating}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary transition hover:bg-light-surface disabled:opacity-50"
            >
              {isCreating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Tạo vault mới
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
