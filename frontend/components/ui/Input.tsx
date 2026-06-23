'use client'

import { clsx } from 'clsx'

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'url' | 'textarea'
  label?: string
  placeholder?: string
  value: string
  onChange: (val: string) => void
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
  error,
  helper,
  required,
  disabled,
  rows,
  className,
}: InputProps) {
  const inputClass = clsx(
    'w-full rounded-card border border-app-line bg-pure-canvas px-3 py-2.5 text-sm text-midnight-ink placeholder:text-app-muted outline-none transition focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/15 disabled:opacity-60',
    type === 'textarea' && 'min-h-[120px] resize-y',
    className,
  )

  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-medium text-midnight-ink">
          {label}
          {required ? ' *' : ''}
        </span>
      ) : null}
      {type === 'textarea' ? (
        <textarea
          rows={rows}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      )}
      {helper ? <span className="mt-2 block text-xs text-app-muted">{helper}</span> : null}
      {error ? <span className="mt-2 block text-xs text-sunset-orange">{error}</span> : null}
    </label>
  )
}
