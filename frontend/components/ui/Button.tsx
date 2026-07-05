'use client'

import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

export interface ButtonProps {
  variant?: 'primary' | 'ghost' | 'danger' | 'green' | 'white' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  disabled?: boolean
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  title?: string
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className,
  onClick,
  type = 'button',
  title,
  children,
}: ButtonProps) {
  const variants = {
    primary: 'border-sky-blue bg-sky-blue text-pure-canvas hover:bg-sky-blue/90',
    ghost: 'border-app-line bg-pure-canvas text-midnight-ink hover:border-sky-blue/40 hover:bg-hint-of-blue/35',
    danger: 'border-sunset-orange bg-sunset-orange text-pure-canvas hover:bg-sunset-orange/90',
    green: 'border-forest-fern bg-forest-fern text-pure-canvas hover:bg-forest-fern/90',
    white: 'border-app-line bg-pure-canvas text-midnight-ink hover:bg-app-bg',
    outline: 'border-app-line bg-transparent text-midnight-ink hover:bg-app-bg/50',
  }
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
  }

  return (
    <button
      type={type}
      title={title}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-button border font-medium leading-none transition focus:outline-none focus:ring-2 focus:ring-sky-blue/25 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      <span className={clsx('inline-flex items-center gap-2', isLoading && 'opacity-70')}>{children}</span>
    </button>
  )
}
