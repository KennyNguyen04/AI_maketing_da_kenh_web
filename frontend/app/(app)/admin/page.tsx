import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth/admin'
import { AdminPanel } from '@/features/admin/components/AdminPanel'
import { Card } from '@/components/ui/Card'

export default async function AdminPage() {
  const { user, profile } = await getCurrentUserProfile()

  if (!user) {
    redirect('/login')
  }

  if (profile?.user_plan !== 'admin') {
    return (
      <Card className="max-w-[640px] border-sunset-orange/25 bg-sunset-orange/5 p-6">
        <h1 className="text-xl text-midnight-ink">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm leading-6 text-dark-charcoal">Admin Alpha Panel chỉ dành cho tài khoản có quyền admin.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-app-muted">Quản trị</p>
        <h1 className="mt-1 text-2xl text-midnight-ink md:text-3xl">Admin Alpha Panel</h1>
        <p className="mt-2 max-w-[760px] text-sm leading-6 text-dark-charcoal">
          Theo dõi user alpha, job lỗi, retry hàng đợi và xuất feedback phục vụ báo cáo chuyên đề.
        </p>
      </header>
      <AdminPanel />
    </div>
  )
}
