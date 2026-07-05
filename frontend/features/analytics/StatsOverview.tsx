'use client'

import { clsx } from 'clsx'
import {
  TrendingUp,
  Twitter,
  Facebook,
  CheckCircle,
  XCircle,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import { Counter } from '@/components/ui/Counter'

interface StatsOverviewProps {
  totalPosts: number
  successfulPosts: number
  failedPosts: number
  successRate: number
  byProvider?: {
    x: { total: number; successful: number; failed: number }
    facebook: { total: number; successful: number; failed: number }
  }
  className?: string
}

type StateKey = 'total' | 'success' | 'warning' | 'danger'

// Static mapping for status badge background. Semantic tokens only - never raw Tailwind colors.
// state -> { background, text, icon color }
const STATUS_TOKENS: Record<StateKey, { bg: string; text: string; icon: string; label: string }> = {
  total: { bg: 'bg-sky-blue/10', text: 'text-sky-blue', icon: 'text-sky-blue', label: 'Tổng cộng' },
  success: { bg: 'bg-forest-fern/10', text: 'text-forest-fern', icon: 'text-forest-fern', label: 'Thành công' },
  warning: { bg: 'bg-sunset-orange/10', text: 'text-sunset-orange', icon: 'text-sunset-orange', label: 'Trung bình' },
  danger: { bg: 'bg-vibrant-orange/10', text: 'text-vibrant-orange', icon: 'text-vibrant-orange', label: 'Thất bại' },
}

function getRateState(rate: number): StateKey {
  if (rate >= 80) return 'success'
  if (rate >= 50) return 'warning'
  return 'danger'
}

function StatCard({
  icon: Icon,
  state,
  value,
  label,
}: {
  icon: LucideIcon
  state: StateKey
  value: string | number
  label: string
}) {
  const tokens = STATUS_TOKENS[state]
  return (
    <div className="rounded-card border border-app-line bg-pure-canvas p-4">
      <div className="flex items-center justify-between">
        <div className={clsx('rounded-nav p-2', tokens.bg)}>
          <Icon className={clsx('h-5 w-5', tokens.icon)} />
        </div>
        <span className={clsx('rounded-badge px-2 py-1 text-xs font-medium', tokens.bg, tokens.text)}>
          {tokens.label}
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold text-midnight-ink">
        {typeof value === 'string' ? value : <Counter value={value} />}
      </p>
      <p className="mt-1 text-sm text-app-muted">{label}</p>
    </div>
  )
}

function ProviderCard({
  icon: Icon,
  iconClass,
  title,
  data,
  successTextClass = 'text-forest-fern',
  dangerTextClass = 'text-vibrant-orange',
}: {
  icon: LucideIcon
  iconClass: string
  title: string
  data: { total: number; successful: number; failed: number }
  successTextClass?: string
  dangerTextClass?: string
}) {
  return (
    <div className="rounded-card border border-app-line bg-pure-canvas p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={clsx('h-5 w-5', iconClass)} />
        <span className="font-medium text-midnight-ink">{title}</span>
      </div>
      <div className="space-y-2">
        <Row label="Tổng cộng" value={data.total} valueClass="text-midnight-ink" />
        <Row label="Thành công" value={data.successful} valueClass={successTextClass} />
        <Row label="Thất bại" value={data.failed} valueClass={dangerTextClass} />
      </div>
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: number; valueClass: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-app-muted">{label}</span>
      <span className={clsx('font-medium', valueClass)}>{value}</span>
    </div>
  )
}

export function StatsOverview({
  totalPosts,
  successfulPosts,
  failedPosts,
  successRate,
  byProvider,
  className,
}: StatsOverviewProps) {
  // Map successRate (0-100) into one of our 4 semantic states.
  const rateState = getRateState(successRate)

  return (
    <div className={clsx('grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <StatCard icon={Clock} state="total" value={totalPosts} label="Bài đăng trong kỳ" />
      <StatCard
        icon={TrendingUp}
        state={rateState}
        value={`${successRate}%`}
        label="Tỷ lệ thành công"
      />
      <StatCard
        icon={CheckCircle}
        state="success"
        value={successfulPosts}
        label="Bài đăng thành công"
      />
      <StatCard
        icon={XCircle}
        state="danger"
        value={failedPosts}
        label="Bài đăng thất bại"
      />

      {byProvider && (
        <>
          <ProviderCard
            icon={Twitter}
            iconClass="text-sky-blue"
            title="X (Twitter)"
            data={byProvider.x}
          />
          <ProviderCard
            icon={Facebook}
            iconClass="text-sky-blue"
            title="Facebook"
            data={byProvider.facebook}
          />
        </>
      )}
    </div>
  )
}
