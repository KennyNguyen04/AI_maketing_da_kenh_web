'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2, RefreshCcw, Users, BarChart3, Activity, Shield } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  user_plan: string
  created_at: string
  total_jobs: number
  failed_jobs: number
}

interface FailedJob {
  id: string
  user_id: string
  title: string | null
  source_type: string
  channels: string[]
  error_message: string | null
  created_at: string
  profile: { email?: string; full_name?: string | null } | null
}

interface AdminStats {
  jobs: { total: number; successRate: number; completed: number; failed: number }
  posts: { total: number; published: number; failed: number; byProvider: { x: number; facebook: number } }
  today: { jobs: number; posts: number; users: number }
  vaults: { total: number }
}

type AdminTab = 'overview' | 'users' | 'jobs' | 'activity'

export function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<{ profile: Record<string, unknown>; jobs: Record<string, unknown>[]; vaults: Record<string, unknown>[] } | null>(null)
  const [userDetailsLoading, setUserDetailsLoading] = useState(false)
  const [jobsFilter, setJobsFilter] = useState('all')
  const [jobsList, setJobsList] = useState<Record<string, unknown>[]>([])
  const [jobsTotal, setJobsTotal] = useState(0)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [statsRes, usersRes, jobsRes, jobsListRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/jobs/failed'),
        fetch(`/api/admin/jobs?status=${jobsFilter}`),
      ])

      const failed: string[] = []
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      } else {
        failed.push(`/api/admin/stats → ${statsRes.status}`)
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      } else {
        failed.push(`/api/admin/users → ${usersRes.status}`)
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json()
        setFailedJobs(jobsData.jobs || [])
      }

      if (jobsListRes.ok) {
        const jobsListData = await jobsListRes.json()
        setJobsList(jobsListData.jobs || [])
        setJobsTotal(jobsListData.total || 0)
      } else {
        let detail = ''
        try {
          const body = await jobsListRes.json()
          detail = body.error || body.message || ''
          if (body.code) detail += ` [${body.code}]`
          if (body.hint) detail += ` (${body.hint})`
        } catch {
          // body not JSON, leave detail blank
        }
        failed.push(`/api/admin/jobs → ${jobsListRes.status}${detail ? `: ${detail}` : ''}`)
      }

      if (failed.length > 0) {
        setError(`Một số API lỗi: ${failed.join(', ')}`)
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
      setError(error instanceof Error ? error.message : 'Không tải được dữ liệu admin')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsFilter])

  async function loadUserDetails(userId: string) {
    setSelectedUserId(userId)
    setUserDetailsLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setUserDetails(data)
      setActiveTab('users')
    } catch (error) {
      console.error('Error loading user details:', error)
      setError(`Không tải được chi tiết user: ${error instanceof Error ? error.message : String(error)}`)
      setUserDetails(null)
    } finally {
      setUserDetailsLoading(false)
    }
  }

  async function retryJob(id: string) {
    setRetryingId(id)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/jobs/${id}/retry`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Retry failed')
      setMessage(`Job ${id.slice(0, 8)} đã được đưa lại vào hàng đợi.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setRetryingId(null)
    }
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'users', label: 'Người dùng' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'activity', label: 'Hoạt động' },
  ]

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-card border border-hint-of-blue bg-hint-of-blue/50 p-3 text-sm text-regal-violet">{message}</div> : null}
      {error ? <div className="rounded-card border border-vibrant-orange/30 bg-vibrant-orange/5 p-3 text-sm text-vibrant-orange">{error}</div> : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'rounded-badge px-4 py-2 text-sm font-medium transition',
              activeTab === tab.id
                ? 'bg-sky-blue text-white'
                : 'border border-app-line bg-white text-midnight-ink hover:border-sky-blue/40'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        loading ? (
          <Card className="p-6 text-sm text-app-muted">Đang tải dữ liệu tổng quan...</Card>
        ) : !stats ? (
          <Card className="p-6 text-sm text-vibrant-orange">Không tải được thống kê. Vui lòng thử lại.</Card>
        ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-card bg-hint-of-blue p-2 text-sky-blue"><Users className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm text-app-muted">Tổng users</p>
                  <p className="mt-1 text-2xl font-semibold text-midnight-ink">{users.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-card bg-forest-fern/10 p-2 text-forest-fern"><Activity className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm text-app-muted">Tỷ lệ thành công</p>
                  <p className="mt-1 text-2xl font-semibold text-midnight-ink">{stats.jobs.successRate}%</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-card bg-hint-of-blue p-2 text-sky-blue"><BarChart3 className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm text-app-muted">Bài đã đăng</p>
                  <p className="mt-1 text-2xl font-semibold text-midnight-ink">{stats.posts.published}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-card bg-sunset-orange/10 p-2 text-sunset-orange"><Shield className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm text-app-muted">Brand Vaults</p>
                  <p className="mt-1 text-2xl font-semibold text-midnight-ink">{stats.vaults.total}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="space-y-3 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-medium text-midnight-ink">Today</h3>
              <span className="text-xs text-app-muted">Cập nhật theo thời gian thực</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-badge border border-app-line bg-light-surface/40 p-4">
                <p className="text-xs text-app-muted">Users mới</p>
                <p className="mt-1 text-xl font-semibold text-midnight-ink">{stats.today.users}</p>
              </div>
              <div className="rounded-badge border border-app-line bg-light-surface/40 p-4">
                <p className="text-xs text-app-muted">Jobs tạo mới</p>
                <p className="mt-1 text-xl font-semibold text-midnight-ink">{stats.today.jobs}</p>
              </div>
              <div className="rounded-badge border border-app-line bg-light-surface/40 p-4">
                <p className="text-xs text-app-muted">Posts xuất bản</p>
                <p className="mt-1 text-xl font-semibold text-midnight-ink">{stats.today.posts}</p>
              </div>
            </div>
          </Card>
        </div>
        )
      )}

      {activeTab === 'users' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-lg text-midnight-ink"><Users className="h-5 w-5" /> Alpha users</h2>
            <a href="/api/admin/feedback/export">
              <Button variant="ghost" size="sm"><Download className="h-4 w-4" /> Export feedback CSV</Button>
            </a>
          </div>

          {selectedUserId && userDetailsLoading && (
            <Card className="space-y-3 border-primary/40 bg-primary/5 p-5 text-sm text-app-muted">
              Đang tải chi tiết user...
            </Card>
          )}

          {selectedUserId && userDetails && !userDetailsLoading && (
            <Card className="space-y-3 border-primary/40 bg-primary/5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-midnight-ink">
                    {(userDetails.profile.full_name as string) || (userDetails.profile.email as string) || 'Unknown user'}
                  </p>
                  <p className="text-xs text-app-muted">{(userDetails.profile.email as string) || ''}</p>
                  <p className="mt-1 text-xs text-app-muted">ID: <span className="font-mono">{(userDetails.profile.id as string) || selectedUserId}</span></p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedUserId(null); setUserDetails(null) }}>Đóng</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-app-muted">Jobs gần đây</p>
                  <p className="mt-1 text-sm text-midnight-ink">{Array.isArray(userDetails.jobs) ? userDetails.jobs.length : 0} jobs</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-app-muted">Brand vaults</p>
                  <p className="mt-1 text-sm text-midnight-ink">{Array.isArray(userDetails.vaults) ? userDetails.vaults.length : 0} vaults</p>
                </div>
              </div>
              {Array.isArray(userDetails.jobs) && userDetails.jobs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-app-muted">Job list (top 20)</p>
                  <ul className="space-y-1 text-xs text-dark-charcoal">
                    {(userDetails.jobs as Array<{ id: string; status: string; title?: string | null }>).slice(0, 5).map((j) => (
                      <li key={j.id} className="flex justify-between gap-2">
                        <span className="truncate">{j.title || 'Untitled'}</span>
                        <Tag label={j.status} color={j.status === 'failed' ? 'red' : j.status === 'done' ? 'green' : 'blue'} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-app-line bg-app-bg text-xs uppercase tracking-wide text-app-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Jobs</th>
                    <th className="px-4 py-3 font-medium">Failed</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-line">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-app-muted">Đang tải dữ liệu...</td></tr>
                  ) : users.map((user) => (
                    <tr key={user.id} className="hover:bg-app-bg">
                      <td className="px-4 py-3">
                        <p className="font-medium text-midnight-ink">{user.full_name || user.email}</p>
                        <p className="text-xs text-app-muted">{user.email}</p>
                      </td>
                      <td className="px-4 py-3"><Tag label={user.user_plan} color={user.user_plan === 'admin' ? 'green' : 'blue'} /></td>
                      <td className="px-4 py-3 text-dark-charcoal">{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                      <td className="px-4 py-3 text-dark-charcoal">{user.total_jobs}</td>
                      <td className="px-4 py-3 text-vibrant-orange">{user.failed_jobs}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => loadUserDetails(user.id)}>Chi tiết</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg text-midnight-ink">Job queue</h2>
            <select
              value={jobsFilter}
              onChange={(e) => setJobsFilter(e.target.value)}
              className="rounded-badge border border-app-line bg-pure-canvas px-3 py-1.5 text-sm text-midnight-ink"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="done">Done</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-app-line bg-app-bg text-xs uppercase tracking-wide text-app-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-line">
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-app-muted">Đang tải dữ liệu...</td></tr>
                  ) : jobsList.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-app-muted">Không có job nào.</td></tr>
                  ) : jobsList.map((job) => (
                    <tr key={job.id as string} className="hover:bg-app-bg">
                      <td className="px-4 py-3">
                        <p className="font-medium text-midnight-ink">{(job.title as string) || 'Untitled'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-dark-charcoal">{(job.user_name as string) || (job.user_email as string) || '—'}</p>
                        <p className="text-xs font-mono text-app-muted">{job.user_id as string}</p>
                      </td>
                      <td className="px-4 py-3 text-dark-charcoal">{(job.source_type as string) || '-'}</td>
                      <td className="px-4 py-3">
                        <Tag label={(job.status as string) || 'pending'} color={(job.status as string) === 'failed' ? 'red' : (job.status as string) === 'done' ? 'green' : 'blue'} />
                      </td>
                      <td className="px-4 py-3 text-dark-charcoal">{new Date(job.created_at as string).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-app-muted">Total: {jobsTotal} jobs</p>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-3">
          <h2 className="text-lg text-midnight-ink">Recent activity</h2>
          {failedJobs.length === 0 && !loading ? (
            <Card className="p-4 text-sm text-app-muted">Không có hoạt động gần đây.</Card>
          ) : failedJobs.map((job) => (
            <Card key={job.id} className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-midnight-ink">{job.title || 'Untitled job'}</p>
                  <p className="mt-1 text-xs text-app-muted">{job.profile?.email || job.user_id} · {job.source_type} · {(job.channels || []).join(', ')}</p>
                  <p className="mt-3 whitespace-pre-wrap rounded-card border border-sunset-orange/15 bg-sunset-orange/5 p-3 text-sm leading-6 text-vibrant-orange">{job.error_message || 'Unknown error'}</p>
                </div>
                <Button size="sm" onClick={() => retryJob(job.id)} disabled={retryingId === job.id}>
                  {retryingId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Retry
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
