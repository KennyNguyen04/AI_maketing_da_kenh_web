'use client'

import { useState, useEffect } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, Calendar, ArrowLeft } from 'lucide-react'
import { StatsOverview, ContentPerformanceTable, StatsChart } from '@/features/analytics'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { createClient } from '@/lib/supabase/client'

interface AnalyticsStats {
  totalPosts: number
  successfulPosts: number
  failedPosts: number
  successRate: number
  byProvider?: {
    x: { total: number; successful: number; failed: number }
    facebook: { total: number; successful: number; failed: number }
  }
  byDay: Record<string, { total: number; successful: number; failed: number }>
}

interface AnalyticsData {
  stats: AnalyticsStats
  channelStats?: Record<string, { total: number; scheduled: number; published: number }>
  posts: Array<{
    id: string
    provider: 'x' | 'facebook'
    target_name: string
    status: 'draft' | 'publishing' | 'published' | 'failed'
    external_post_url?: string
    error_message?: string
    created_at: string
    drafts?: {
      content: string
      channel: string
      repurpose_jobs?: {
        title: string
      }
    }
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  period: number
}

const PERIOD_OPTIONS = [
  { value: '7', label: '7 ngày' },
  { value: '30', label: '30 ngày' },
  { value: '90', label: '90 ngày' },
]

export default function AnalyticsPage() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        redirect('/login')
      }
      setUser(user)
      await fetchAnalytics(user.id, period, 1)
    }
    fetchUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchAnalytics(user.id, period, 1)
    }
  }, [period])

  const fetchAnalytics = async (userId: string, periodValue: string, page: number) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const params = new URLSearchParams({
        period: periodValue,
        page: page.toString(),
        limit: '20',
      })

      const response = await fetch(`/api/analytics?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center text-sm text-app-muted hover:text-midnight-ink"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Quay lại Dashboard
          </Link>
          <p className="text-sm font-medium text-app-muted">Thống kê hoạt động</p>
          <h1 className="mt-1 text-2xl text-midnight-ink md:text-3xl">Phân tích</h1>
          <p className="mt-2 text-sm text-app-muted">
            Theo dõi hiệu suất và hoạt động đăng bài của bạn
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-1 rounded-card bg-app-bg p-1">
            <Calendar className="ml-2 h-4 w-4 text-app-muted" />
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`rounded-nav px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === option.value
                    ? 'bg-pure-canvas text-midnight-ink shadow-sm'
                    : 'text-app-muted hover:text-midnight-ink'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Link href="/scheduler">
            <Button variant="outline">
              <Calendar className="h-4 w-4" /> Lịch đăng bài
            </Button>
          </Link>
        </div>
      </header>

      {isLoading ? (
        <Loading size="lg" label="Đang tải thống kê..." />
      ) : analyticsData ? (
        <>
          {/* Stats Overview */}
          <StatsOverview
            totalPosts={analyticsData.stats.totalPosts}
            successfulPosts={analyticsData.stats.successfulPosts}
            failedPosts={analyticsData.stats.failedPosts}
            successRate={analyticsData.stats.successRate}
            byProvider={analyticsData.stats.byProvider}
          />

          {/* Chart */}
          <StatsChart data={analyticsData.stats.byDay} />

          {/* Content Performance Table */}
          <ContentPerformanceTable posts={analyticsData.posts} />

          {/* Pagination */}
          {analyticsData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAnalytics(user!.id, period, analyticsData.pagination.page - 1)}
                disabled={analyticsData.pagination.page <= 1}
              >
                Trước
              </Button>
              <span className="text-sm text-app-muted">
                Trang {analyticsData.pagination.page} / {analyticsData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAnalytics(user!.id, period, analyticsData.pagination.page + 1)}
                disabled={analyticsData.pagination.page >= analyticsData.pagination.totalPages}
              >
                Sau
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Không có dữ liệu phân tích"
          description="Bắt đầu đăng bài để xem thống kê"
          action={{
            label: 'Tạo nội dung mới',
            onClick: () => (window.location.href = '/dashboard/new'),
          }}
        />
      )}
    </div>
  )
}
