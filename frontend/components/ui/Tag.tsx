'use client'

import { X } from 'lucide-react'
import { clsx } from 'clsx'

export interface TagProps {
  label: string
  color?: 'blue' | 'green' | 'orange' | 'pink'
  editable?: boolean
  onRemove?: () => void
  className?: string
}

export function Tag({ label, color = 'blue', editable, onRemove, className }: TagProps) {
  const colors = {
    blue: 'border-hint-of-blue bg-hint-of-blue/60 text-regal-violet',
    green: 'border-forest-fern/20 bg-forest-fern/10 text-deep-moss',
    orange: 'border-sunset-orange/25 bg-sunset-orange/10 text-vibrant-orange',
    pink: 'border-blush-pink/30 bg-blush-pink/10 text-midnight-ink',
  }

  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-badge border px-2.5 py-1 text-xs font-medium', colors[color], className)}>
      {label}
      {editable ? (
        <button type="button" onClick={onRemove} className="rounded-full p-0.5 hover:bg-pitch-black/10" aria-label={`Remove ${label}`}>
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  )
}
