'use client'

import { useState, useEffect } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, List, Clock, Plus, BarChart3 } from 'lucide-react'
import { SchedulerCalendar, QueueList, TimeSlotPicker } from '@/features/scheduler'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { Counter } from '@/components/ui/Counter'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type ViewMode = 'calendar' | 'queue'
type ScheduleStatus = 'scheduled' | 'past' | 'all'

interface ScheduledDraft {
  id: string
  job_id: string
  channel: string
  content: string
  scheduled_for: string
  publish_status: string
  repurpose_jobs?: {
    id: string
    title: string
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function SchedulerPage() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [status, setStatus] = useState<ScheduleStatus>('scheduled')
  const [scheduledDrafts, setScheduledDrafts] = useState<ScheduledDraft[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<ScheduledDraft | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        redirect('/login')
      }
      setUser(user)
      await fetchScheduledDrafts(user.id, status, 1)
    }
    fetchUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchScheduledDrafts(user.id, status, pagination.page)
    }
  }, [status, pagination.page])

  const fetchScheduledDrafts = async (userId: string, statusFilter: ScheduleStatus, page: number) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter,
      })

      const response = await fetch(`/api/schedule?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch scheduled drafts')
      }

      const data = await response.json()
      setScheduledDrafts(data.drafts || [])
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching scheduled drafts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSchedule = async (draftId: string) => {
    try {
      const response = await fetch(`/api/schedule/${draftId}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to cancel schedule')
      }

      await fetchScheduledDrafts(user!.id, status, pagination.page)
    } catch (error) {
      console.error('Error cancelling schedule:', error)
      throw error
    }
  }

  const handleSchedule = async (draftId: string, scheduledFor: Date) => {
    try {
      const response = await fetch(`/api/schedule/${draftId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduledFor: scheduledFor.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to schedule draft')
      }

      await fetchScheduledDrafts(user!.id, status, pagination.page)
    } catch (error) {
      console.error('Error scheduling draft:', error)
      throw error
    }
  }

  const handlePostClick = (post: { id: string; content: string }) => {
    const draft = scheduledDrafts.find(d => d.id === post.id)
    setSelectedDraft(draft || null)
  }

  const formatPostsForCalendar = () => {
    return scheduledDrafts.map((draft) => ({
      id: draft.id,
      channel: draft.channel,
      content: draft.content,
      scheduled_for: draft.scheduled_for,
      job_title: draft.repurpose_jobs?.title,
    }))
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-app-muted">Quản lý lịch đăng</p>
          <h1 className="mt-1 text-2xl text-midnight-ink md:text-3xl">Lịch đăng bài</h1>
          <p className="mt-2 text-sm text-app-muted">
            Xem và quản lý các bài đăng đã lên lịch
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/new">
            <Button>
              <Plus className="h-4 w-4" /> Tạo nội dung mới
            </Button>
          </Link>
          <Link href="/analytics">
            <Button variant="white">
              <BarChart3 className="h-4 w-4" /> Xem thống kê
            </Button>
          </Link>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-nav bg-sky-blue/10 p-2">
              <CalendarDays className="h-5 w-5 text-sky-blue" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-midnight-ink">
                <Counter value={pagination.total} />
              </p>
              <p className="text-sm text-app-muted">Bài đã lên lịch</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-nav bg-forest-fern/10 p-2">
              <Clock className="h-5 w-5 text-forest-fern" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-midnight-ink">
                <Counter
                  value={scheduledDrafts.filter((d) => new Date(d.scheduled_for) > new Date()).length}
                />
              </p>
              <p className="text-sm text-app-muted">Sắp tới</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-nav bg-sunset-orange/10 p-2">
              <List className="h-5 w-5 text-sunset-orange" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-midnight-ink">
                <Counter value={scheduledDrafts.length} />
              </p>
              <p className="text-sm text-app-muted">Đang hiển thị</p>
            </div>
          </div>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1 bg-app-bg rounded-card">
          <button
            onClick={() => setViewMode('calendar')}
              className={cn(
                'flex items-center gap-2 rounded-nav px-4 py-2 text-sm font-medium transition-colors',
                viewMode === 'calendar'
                  ? 'bg-pure-canvas text-midnight-ink shadow-sm'
                  : 'text-app-muted hover:text-midnight-ink'
              )}
          >
            <CalendarDays className="h-4 w-4" />
            Lịch
          </button>
          <button
            onClick={() => setViewMode('queue')}
              className={cn(
                'flex items-center gap-2 rounded-nav px-4 py-2 text-sm font-medium transition-colors',
                viewMode === 'queue'
                  ? 'bg-pure-canvas text-midnight-ink shadow-sm'
                  : 'text-app-muted hover:text-midnight-ink'
              )}
          >
            <List className="h-4 w-4" />
            Danh sách
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ScheduleStatus)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="rounded-card border border-app-line bg-pure-canvas p-2 text-sm focus:border-sky-blue focus:outline-none focus:ring-2 focus:ring-sky-blue/20"
          >
            <option value="scheduled">Sắp tới</option>
            <option value="past">Đã quá hạn</option>
            <option value="all">Tất cả</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Loading size="lg" label="Đang tải dữ liệu..." />
      ) : viewMode === 'calendar' ? (
        <SchedulerCalendar
          posts={formatPostsForCalendar()}
          onPostClick={handlePostClick}
        />
      ) : (
        <QueueList
          items={formatPostsForCalendar()}
          onCancelRequest={(id) => setConfirmCancelId(id)}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="white"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page <= 1}
          >
            Trước
          </Button>
          <span className="text-sm text-dark-charcoal/60">
            Trang {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="white"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= pagination.totalPages}
          >
            Sau
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && scheduledDrafts.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="Chưa có bài đăng nào được lên lịch"
          description="Tạo nội dung mới và đặt lịch đăng bài"
          action={{
            label: 'Tạo nội dung mới',
            onClick: () => (window.location.href = '/dashboard/new'),
            icon: Plus,
          }}
        />
      )}

      {/* Time Slot Picker Modal */}
      <TimeSlotPicker
        isOpen={showTimePicker}
        draftId={selectedDraft?.id || ''}
        channel={selectedDraft?.channel || 'twitter'}
        onClose={() => {
          setShowTimePicker(false)
          setSelectedDraft(null)
        }}
        onSchedule={async (draftId, dateTime) => {
          await handleSchedule(draftId, dateTime)
        }}
      />

      {/* Confirm Cancel Modal */}
      <Modal
        isOpen={confirmCancelId !== null}
        title="Hủy lịch đăng bài này?"
        body="Bản nháp sẽ không bị xóa — bạn có thể lên lịch lại bất cứ lúc nào."
        confirmLabel="Hủy lịch"
        confirmVariant="danger"
        onConfirm={async () => {
          if (confirmCancelId) {
            await handleCancelSchedule(confirmCancelId)
            setConfirmCancelId(null)
          }
        }}
        onClose={() => setConfirmCancelId(null)}
      />
    </div>
  )
}
