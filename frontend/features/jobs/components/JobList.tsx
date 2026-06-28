'use client'

import { Card } from '@/components/ui/Card'
import { EmptyState } from './EmptyState'
import { JobCard } from './JobCard'

interface JobListProps {
  jobs: any[]
  loading?: boolean
}

export function JobList({ jobs, loading = false }: JobListProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden p-0">
        <div className="space-y-0 divide-y divide-app-line">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex animate-pulse items-center gap-4 px-4 py-4">
              <div className="h-4 w-1/2 rounded bg-light-gray" />
              <div className="hidden h-4 w-24 rounded bg-light-gray sm:block" />
              <div className="hidden h-4 w-20 rounded bg-light-gray md:block" />
              <div className="ml-auto h-6 w-16 rounded-full bg-light-gray" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (!jobs || jobs.length === 0) {
    return <EmptyState />
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="hidden grid-cols-[minmax(220px,2fr)_1fr_120px_130px_100px] border-b border-app-line bg-app-bg px-4 py-3 text-xs font-medium uppercase tracking-wide text-app-muted md:grid">
        <span>Tiêu đề</span>
        <span>Kênh</span>
        <span>Ngày</span>
        <span>Trạng thái</span>
        <span />
      </div>
      <div className="divide-y divide-app-line">
        {jobs.map((job) => <JobCard key={job.id} job={job} />)}
      </div>
    </Card>
  )
}
