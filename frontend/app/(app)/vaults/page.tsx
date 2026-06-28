import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { VaultManagement } from '@/features/brand-vault/components/VaultManagement'
import { Button } from '@/components/ui/Button'

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
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-app-muted">Brand Vaults</p>
          <h1 className="mt-1 text-2xl text-midnight-ink md:text-3xl">Quản lý Brand Vault</h1>
          <p className="mt-2 text-sm text-dark-charcoal">
            Tạo và quản lý nhiều giọng văn cho các thương hiệu khác nhau.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/onboarding">
            <Button>
              Tạo vault mới
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="white">
              Về Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <VaultManagement initialVaults={vaults || []} />
    </div>
  )
}
