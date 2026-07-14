'use client'

import { clsx } from 'clsx'
import { useId } from 'react'

export interface NumberInputProps {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  helper?: string
  disabled?: boolean
  className?: string
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  helper,
  disabled,
  className,
}: NumberInputProps) {
  const generatedId = useId()
  const inputId = label ? `number-${generatedId}` : undefined

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '') {
      onChange(0)
      return
    }
    let num = parseFloat(val)
    if (isNaN(num)) return
    if (min !== undefined) num = Math.max(min, num)
    if (max !== undefined) num = Math.min(max, num)
    onChange(num)
  }

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-midnight-ink">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        type="number"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-card border border-app-line bg-pure-canvas px-3 py-2.5 text-sm text-midnight-ink placeholder:text-app-muted outline-none transition focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/15 disabled:opacity-60"
      />
      {helper ? <span className="text-xs text-app-muted">{helper}</span> : null}
    </div>
  )
}
