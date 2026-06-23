'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2, RefreshCcw, Users } from 'lucide-react'
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

export function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    const [usersRes, jobsRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/jobs/failed'),
    ])
    const usersData = await usersRes.json()
    const jobsData = await jobsRes.json()
    setUsers(usersData.users || [])
    setFailedJobs(jobsData.jobs || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

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

  const totals = {
    users: users.length,
    jobs: users.reduce((sum, user) => sum + user.total_jobs, 0),
    failed: users.reduce((sum, user) => sum + user.failed_jobs, 0),
  }

  return (
    <div className="space-y-6">
      {message ? <div className="rounded-card border border-hint-of-blue bg-hint-of-blue/50 p-3 text-sm text-regal-violet">{message}</div> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-app-muted">Users</p>
          <p className="mt-1 text-2xl font-semibold text-midnight-ink">{totals.users}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-app-muted">Total jobs</p>
          <p className="mt-1 text-2xl font-semibold text-midnight-ink">{totals.jobs}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-app-muted">Failed jobs</p>
          <p className="mt-1 text-2xl font-semibold text-vibrant-orange">{totals.failed}</p>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg text-midnight-ink"><Users className="h-5 w-5" /> Alpha users</h2>
          <a href="/api/admin/feedback/export">
            <Button variant="ghost" size="sm"><Download className="h-4 w-4" /> Export feedback CSV</Button>
          </a>
        </div>

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
                </tr>
              </thead>
              <tbody className="divide-y divide-app-line">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-app-muted">Đang tải dữ liệu...</td></tr>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg text-midnight-ink">Failed jobs</h2>
        {failedJobs.length === 0 && !loading ? (
          <Card className="p-4 text-sm text-app-muted">Không có job failed nào.</Card>
        ) : failedJobs.map((job) => (
          <Card key={job.id} className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-midnight-ink">{job.title || 'Untitled job'}</p>
                <p className="mt-1 text-xs text-app-muted">{job.profile?.email || job.user_id} · {job.source_type} · {job.channels.join(', ')}</p>
                <p className="mt-3 whitespace-pre-wrap rounded-card border border-sunset-orange/15 bg-sunset-orange/5 p-3 text-sm leading-6 text-vibrant-orange">{job.error_message || 'Unknown error'}</p>
              </div>
              <Button size="sm" onClick={() => retryJob(job.id)} disabled={retryingId === job.id}>
                {retryingId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Retry
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  )
}
