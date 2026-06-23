import { clsx } from 'clsx'

export interface CardProps {
  variant?: 'default' | 'sand' | 'orange' | 'green' | 'blush'
  className?: string
  children: React.ReactNode
}

export function Card({ variant = 'default', className, children }: CardProps) {
  const variants = {
    default: 'border border-app-line bg-pure-canvas p-5 shadow-sm',
    sand: 'border border-app-line bg-pure-canvas p-5',
    orange: 'border border-sunset-orange/25 bg-sunset-orange/10 p-5 text-vibrant-orange',
    green: 'border border-forest-fern/20 bg-forest-fern/10 p-5 text-deep-moss',
    blush: 'border border-blush-pink/30 bg-blush-pink/10 p-5 text-midnight-ink',
  }

  return <div className={clsx('rounded-card', variants[variant], className)}>{children}</div>
}
