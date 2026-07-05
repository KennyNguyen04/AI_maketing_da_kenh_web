'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

export interface CounterProps {
  value: number
  duration?: number
  /** Optional formatter for the displayed value. Receives the current animated number. */
  format?: (value: number) => string
  className?: string
}

/**
 * Animated number ticker. Renders `value` and animates from 0 to `value` on mount / on change.
 * Uses requestAnimationFrame for smoothness. Pauses when off-screen via `useInView`.
 */
export function Counter({ value, duration = 600, format, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: false })
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (!isInView) return
    const from = fromRef.current
    const to = value
    if (from === to) return
    const start = performance.now()
    let frame: number

    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / duration)
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = from + (to - from) * eased
      setDisplay(current)
      if (progress < 1) {
        frame = requestAnimationFrame(step)
      } else {
        fromRef.current = to
      }
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, isInView])

  const formatted = format ? format(display) : Math.round(display).toLocaleString('vi-VN')

  return (
    <span ref={ref} className={className} aria-live="polite">
      {formatted}
    </span>
  )
}
