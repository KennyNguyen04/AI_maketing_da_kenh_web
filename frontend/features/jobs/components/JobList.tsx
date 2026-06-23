import { Card } from '@/components/ui/Card'
import { EmptyState } from './EmptyState'
import { JobCard } from './JobCard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function JobList({ jobs }: { jobs: any[] }) {
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
