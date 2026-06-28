import { redirect } from 'next/navigation'
import Link from 'next/link'
import { History, Plus, CalendarDays, BarChart3 } from 'lucide-react'
import { BrandVaultStatus } from '@/features/brand-vault/components/BrandVaultStatus'
import { JobList } from '@/features/jobs/components/JobList'
import { PublishHistory } from '@/features/review/components/PublishHistory'
import { ExtensionStatusCheck } from '@/components/ExtensionStatusCheck'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: jobs } = await supabase
    .from('repurpose_jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const completed = jobs?.filter((job) => job.status === 'done').length || 0

  const { count: draftsCount } = await supabase
    .from('drafts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const firstName = user.user_metadata?.full_name?.split(' ').at(-1) || 'bạn'

  const { data: vault } = await supabase
    .from('brand_vaults')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const stats = [
    { value: completed, label: 'Đã hoàn thành' },
    { value: jobs?.length || 0, label: 'Lần tái chế' },
    { value: draftsCount || 0, label: 'Bản nháp' },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-app-muted">Tổng quan</p>
          <h1 className="mt-1 text-2xl text-midnight-ink md:text-3xl">Xin chào, {firstName}</h1>
          <p className="mt-2 text-sm text-dark-charcoal">Theo dõi nội dung đã tạo, Brand Vault và lịch sử phân phối.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/history">
            <Button variant="white">
              <History className="h-4 w-4" /> Lịch sử đăng
            </Button>
          </Link>
          <Link href="/scheduler">
            <Button variant="white">
              <CalendarDays className="h-4 w-4" /> Lịch đăng bài
            </Button>
          </Link>
          <Link href="/analytics">
            <Button variant="white">
              <BarChart3 className="h-4 w-4" /> Thống kê
            </Button>
          </Link>
          <Link href="/dashboard/new">
            <Button>
              <Plus className="h-4 w-4" /> Tạo nội dung mới
            </Button>
          </Link>
        </div>
      </header>

      <ExtensionStatusCheck />

      <BrandVaultStatus vault={vault} />

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-2xl font-semibold text-midnight-ink">{item.value}</p>
            <p className="mt-1 text-sm text-app-muted">{item.label}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg text-midnight-ink">Lịch sử tái chế</h2>
            <p className="text-sm text-app-muted">Các job mới nhất được hiển thị đầu tiên.</p>
          </div>
        </div>
        <JobList jobs={jobs || []} />
      </section>
    </div>
  )
}
