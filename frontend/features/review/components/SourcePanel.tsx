'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SourcePanel({ job }: { job: any }) {
  const [expanded, setExpanded] = useState(false)
  const sourceLabel = job.source_type === 'url' ? 'URL' : 'Text'

  return (
    <aside className="lg:sticky lg:top-8">
      <Card className="p-4">
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-midnight-ink">
          Nội dung gốc
          <ChevronDown className={expanded ? 'h-4 w-4 rotate-180 transition' : 'h-4 w-4 transition'} />
        </button>
        <div className="mt-3 flex items-center gap-2">
          <Tag label={sourceLabel} color="blue" />
          <span className="text-xs text-app-muted">{job.source_content?.length || 0} ký tự</span>
        </div>
        {expanded ? (
          <p className="mt-4 max-h-[360px] overflow-y-auto whitespace-pre-line rounded-card border border-app-line bg-app-bg p-3 text-sm leading-6 text-dark-charcoal">
            {job.source_content}
          </p>
        ) : (
          <p className="mt-4 line-clamp-5 text-sm leading-6 text-app-muted">{job.source_content}</p>
        )}
      </Card>
    </aside>
  )
}
