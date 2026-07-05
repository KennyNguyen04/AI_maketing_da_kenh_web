'use client'

import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

export interface LoadingProps {
  /** sm = 16px (inline), md = 24px (section), lg = 32px (page) */
  size?: 'sm' | 'md' | 'lg'
  label?: string
  /** Center the loader on a full-viewport overlay */
  fullScreen?: boolean
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<LoadingProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-[3px]',
  lg: 'h-8 w-8 border-4',
}

const SPIN_CLASSES: Record<NonNullable<LoadingProps['size']>, string> = {
  sm: 'animate-spin',
  md: 'animate-spin',
  lg: 'animate-spin',
}

export function Loading({
  size = 'md',
  label,
  fullScreen = false,
  className,
}: LoadingProps) {
  const spinner = (
    <Loader2
      className={clsx(
        'border-sky-blue/20 border-t-sky-blue rounded-full',
        SIZE_CLASSES[size],
        SPIN_CLASSES[size],
      )}
    />
  )

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-pure-canvas/80 backdrop-blur-sm"
        role="status"
        aria-busy="true"
        aria-live="polite"
      >
        {spinner}
        {label ? <p className="mt-4 text-sm text-app-muted">{label}</p> : null}
        <span className="sr-only">{label ?? 'Đang tải'}</span>
      </div>
    )
  }

  return (
    <div
      className={clsx('flex items-center justify-center', className)}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        {spinner}
        {label ? <p className="text-sm text-app-muted">{label}</p> : null}
        <span className="sr-only">{label ?? 'Đang tải'}</span>
      </div>
    </div>
  )
}
