import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PublishHistory } from '@/features/review/components/PublishHistory'
import { createClient } from '@/lib/supabase/server'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-app-muted hover:text-midnight-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại Dashboard
        </Link>
        <h1 className="text-2xl text-midnight-ink md:text-3xl">Lịch sử đăng bài</h1>
        <p className="mt-1 text-sm text-dark-charcoal">
          Theo dõi tất cả các bài đã đăng lên X và Facebook.
        </p>
      </header>

      <PublishHistory />
    </div>
  )
}
