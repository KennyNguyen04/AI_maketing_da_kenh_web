'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fingerprint, LayoutDashboard, LogOut, Settings, ShieldCheck, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { signOut } from '@/features/auth/actions'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { href: '/vaults', icon: Fingerprint, label: 'Brand Vault' },
  { href: '/dashboard/new', icon: Sparkles, label: 'Tạo nội dung' },
  { href: '/settings', icon: Settings, label: 'Phân phối' },
]

export function Sidebar({ userName, userInitials, userPlan }: { userName: string; userInitials: string; userPlan: string }) {
  const pathname = usePathname()
  const items = userPlan === 'admin'
    ? [...navItems, { href: '/admin', icon: ShieldCheck, label: 'Admin Alpha' }]
    : navItems

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-app-line bg-pure-canvas px-4 md:hidden">
        <Link href="/dashboard" className="text-lg font-semibold text-midnight-ink">Amplify</Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-card bg-sky-blue text-sm font-medium text-pure-canvas">
          {userInitials}
        </div>
      </header>

      <aside aria-label="Menu chính" className="fixed bottom-0 left-0 right-0 z-40 border-t border-app-line bg-pure-canvas px-2 py-2 md:bottom-auto md:right-auto md:top-0 md:flex md:h-screen md:w-[232px] md:flex-col md:border-r md:px-3 md:py-5">
        <div className="hidden border-b border-app-line pb-5 md:block">
          <Link href="/dashboard" className="text-xl font-semibold text-midnight-ink">Amplify</Link>
          <p className="mt-1 text-xs text-app-muted">AI Marketing Workspace</p>
        </div>

        <nav aria-label="Điều hướng ứng dụng" className="grid grid-cols-4 gap-1 md:mt-5 md:flex md:flex-1 md:flex-col">
          {items.map((item) => {
            const Icon = item.icon
            const active = item.href !== '/dashboard' ? pathname.startsWith(item.href) : pathname === '/dashboard'
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                className={clsx(
                  'flex min-h-12 flex-col items-center justify-center gap-1 rounded-nav px-2 py-2 text-[11px] font-medium transition md:min-h-0 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-sm',
                  active ? 'bg-hint-of-blue/60 text-sky-blue' : 'text-app-muted hover:bg-app-bg hover:text-midnight-ink',
                )}
              >
                <Icon className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-3 border-t border-app-line pt-5 md:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-card bg-sky-blue text-sm font-medium text-pure-canvas">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-midnight-ink">{userName}</p>
            <span className="text-xs capitalize text-app-muted">{userPlan} plan</span>
          </div>
          <form action={signOut}>
            <button type="submit" className="rounded-nav p-2 text-app-muted transition hover:bg-app-bg hover:text-midnight-ink" title="Đăng xuất" aria-label="Đăng xuất">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
