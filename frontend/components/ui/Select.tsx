'use client'

import * as React from 'react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  name?: string
  required?: boolean
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = '',
  name,
  required = false,
}: SelectProps) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`h-10 w-full rounded-card border border-app-line bg-pure-canvas px-3 text-sm text-midnight-ink transition-colors focus:border-sky-blue focus:outline-none focus:ring-1 focus:ring-sky-blue disabled:cursor-not-allowed disabled:bg-app-bg disabled:opacity-50 ${className}`}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
