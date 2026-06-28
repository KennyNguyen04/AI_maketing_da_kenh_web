'use client'

import { clsx } from 'clsx'
import { useId } from 'react'

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'textarea'
  label?: string
  placeholder?: string
  value: string
  onChange: (val: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  error?: string
  helper?: string
  required?: boolean
  disabled?: boolean
  rows?: number
  className?: string
}

export function Input({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onKeyDown,
  error,
  helper,
  required,
  disabled,
  rows,
  className,
}: InputProps) {
  const generatedId = useId()
  const inputId = label ? `input-${generatedId}` : undefined

  const inputClass = clsx(
    'w-full rounded-card border border-app-line bg-pure-canvas px-3 py-2.5 text-sm text-midnight-ink placeholder:text-app-muted outline-none transition focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/15 disabled:opacity-60',
    type === 'textarea' && 'min-h-[120px] resize-y',
    className,
  )

  const inputProps = {
    id: inputId,
    placeholder,
    value,
    disabled,
    required,
    className: inputClass,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    onKeyDown,
  }

  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-midnight-ink">
          {label}
          {required ? ' *' : ''}
        </label>
      ) : null}
      {type === 'textarea' ? (
        <textarea rows={rows} {...inputProps} />
      ) : (
        <input type={type} {...inputProps} />
      )}
      {helper ? <span className="text-xs text-app-muted">{helper}</span> : null}
      {error ? <span className="text-xs text-sunset-orange">{error}</span> : null}
    </div>
  )
}
