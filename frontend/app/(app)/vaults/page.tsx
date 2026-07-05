import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Fingerprint, Plus, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { VaultManagement } from '@/features/brand-vault/components/VaultManagement'

export const dynamic = 'force-dynamic'

export default async function VaultsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: vaults } = await supabase
    .from('brand_vaults')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  const safeVaults = vaults || []
  const activeVault = safeVaults.find((v) => v.is_active) || null
  const hasActiveVoice = activeVault && activeVault.voice_profile

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-app-muted">Brand Vaults</p>
          <h1 className="mt-1 text-2xl text-midnight-ink md:text-3xl">Quản lý Brand Vault</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-dark-charcoal">
            Mỗi Brand Vault là một bộ nhớ giọng văn riêng. Tạo nhiều vault cho nhiều thương hiệu,
            chọn 1 vault đang hoạt động để AI dùng khi tái chế nội dung.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/new">
            <Button variant="white">
              <Sparkles className="h-4 w-4" /> Tạo nội dung
            </Button>
          </Link>
          <Link href="/onboarding">
            <Button>
              <Plus className="h-4 w-4" /> Tạo Brand Vault mới
            </Button>
          </Link>
        </div>
      </header>

      {hasActiveVoice && (
        <Card variant="green" className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-forest-fern/20 text-deep-moss">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-deep-moss">
                Đang dùng: {activeVault.display_name || activeVault.name}
              </p>
              <p className="mt-1 text-xs text-deep-moss/80">
                Vault này sẽ được dùng làm giọng văn mặc định khi bạn tạo nội dung mới.
              </p>
            </div>
          </div>
          <Link href="/dashboard/new">
            <Button size="sm">
              <Sparkles className="h-3.5 w-3.5" /> Tạo nội dung ngay
            </Button>
          </Link>
        </Card>
      )}

      <VaultManagement initialVaults={safeVaults} />

      <div className="border-t border-app-line pt-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-app-muted transition hover:text-midnight-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Về Dashboard
        </Link>
      </div>
    </div>
  )
}