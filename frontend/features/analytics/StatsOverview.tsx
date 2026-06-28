'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Twitter, Facebook, CheckCircle, XCircle, Clock } from 'lucide-react'

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

export function StatsOverview({
  totalPosts,
  successfulPosts,
  failedPosts,
  successRate,
  byProvider,
  className
}: StatsOverviewProps) {
  const formatTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: current, trend: 'up' as const, percentage: 0 }
    const change = ((current - previous) / previous) * 100
    return {
      value: current,
      trend: change >= 0 ? ('up' as const) : ('down' as const),
      percentage: Math.abs(change).toFixed(1),
    }
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {/* Total Posts */}
      <div className="bg-white rounded-lg border border-light-border p-4">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            Tổng cộng
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold text-midnight-ink">{totalPosts}</p>
        <p className="text-sm text-dark-charcoal/60 mt-1">Bài đăng trong kỳ</p>
      </div>

      {/* Success Rate */}
      <div className="bg-white rounded-lg border border-light-border p-4">
        <div className="flex items-center justify-between">
          <div className={cn(
            'p-2 rounded-lg',
            successRate >= 80 ? 'bg-green-100' : successRate >= 50 ? 'bg-yellow-100' : 'bg-red-100'
          )}>
            <TrendingUp className={cn(
              'h-5 w-5',
              successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
            )} />
          </div>
          <span className={cn(
            'text-xs font-medium px-2 py-1 rounded-full',
            successRate >= 80 ? 'text-green-600 bg-green-50' :
            successRate >= 50 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'
          )}>
            Thành công
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold text-midnight-ink">{successRate}%</p>
        <p className="text-sm text-dark-charcoal/60 mt-1">Tỷ lệ thành công</p>
      </div>

      {/* Successful Posts */}
      <div className="bg-white rounded-lg border border-light-border p-4">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            Thành công
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold text-midnight-ink">{successfulPosts}</p>
        <p className="text-sm text-dark-charcoal/60 mt-1">Bài đăng thành công</p>
      </div>

      {/* Failed Posts */}
      <div className="bg-white rounded-lg border border-light-border p-4">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-red-100 rounded-lg">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
            Thất bại
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold text-midnight-ink">{failedPosts}</p>
        <p className="text-sm text-dark-charcoal/60 mt-1">Bài đăng thất bại</p>
      </div>

      {/* Provider Breakdown */}
      {byProvider && (
        <>
          {/* X Stats */}
          <div className="bg-white rounded-lg border border-light-border p-4 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Twitter className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-midnight-ink">X (Twitter)</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-charcoal/60">Tổng cộng</span>
                <span className="font-medium text-midnight-ink">{byProvider.x.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-charcoal/60">Thành công</span>
                <span className="font-medium text-green-600">{byProvider.x.successful}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-charcoal/60">Thất bại</span>
                <span className="font-medium text-red-600">{byProvider.x.failed}</span>
              </div>
            </div>
          </div>

          {/* Facebook Stats */}
          <div className="bg-white rounded-lg border border-light-border p-4 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Facebook className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-midnight-ink">Facebook</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-charcoal/60">Tổng cộng</span>
                <span className="font-medium text-midnight-ink">{byProvider.facebook.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-charcoal/60">Thành công</span>
                <span className="font-medium text-green-600">{byProvider.facebook.successful}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-charcoal/60">Thất bại</span>
                <span className="font-medium text-red-600">{byProvider.facebook.failed}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
