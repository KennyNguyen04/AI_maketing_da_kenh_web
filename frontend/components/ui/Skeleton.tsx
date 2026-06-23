import { clsx } from 'clsx'

export function Skeleton({ variant = 'text', className }: { variant?: 'text' | 'card' | 'avatar'; className?: string }) {
  const variants = {
    text: 'h-4 rounded',
    card: 'h-[120px] rounded-card',
    avatar: 'h-10 w-10 rounded-full',
  }

  return (
    <div
      className={clsx(
        'bg-[linear-gradient(90deg,var(--color-warm-sand)_25%,var(--color-muted-stone)_50%,var(--color-warm-sand)_75%)] bg-[length:200%_100%] [animation:shimmer_1.5s_infinite]',
        variants[variant],
        className,
      )}
    />
  )
}
