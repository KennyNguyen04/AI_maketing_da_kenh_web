import { JobStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/constants'
import { clsx } from 'clsx'

export function StatusBadge({ status }: { status: JobStatus }) {
  const styles: Record<JobStatus, string> = {
    pending: 'border-hint-of-blue bg-hint-of-blue/60 text-regal-violet',
    processing: 'border-sky-blue/25 bg-sky-blue/10 text-sky-blue',
    done: 'border-forest-fern/20 bg-forest-fern/10 text-deep-moss',
    failed: 'border-sunset-orange/25 bg-sunset-orange/10 text-vibrant-orange',
  }
  const label = STATUS_LABELS[status]

  return (
    <span className={clsx('inline-flex items-center gap-2 rounded-badge border px-2.5 py-1 text-xs font-medium', styles[status])}>
      {status === 'processing' ? <span className="h-2 w-2 rounded-full bg-current [animation:pulse-dot_1s_infinite]" /> : null}
      {label.vi}
    </span>
  )
}
