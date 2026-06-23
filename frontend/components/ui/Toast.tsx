'use client'

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { clsx } from 'clsx'

export interface ToastProps {
  type: 'success' | 'error' | 'info'
  message: string
  isVisible: boolean
  onClose: () => void
}

export function Toast({ type, message, isVisible, onClose }: ToastProps) {
  const styles = {
    success: 'border-forest-fern/20 bg-forest-fern text-pure-canvas',
    error: 'border-sunset-orange/20 bg-sunset-orange text-pure-canvas',
    info: 'border-sky-blue/20 bg-sky-blue text-pure-canvas',
  }
  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  }
  const Icon = icons[type]

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          className={clsx('fixed bottom-5 right-5 z-[9999] flex max-w-[360px] items-center gap-3 rounded-card border px-4 py-3 text-sm font-medium shadow-lg', styles[type])}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span>{message}</span>
          <button type="button" onClick={onClose} className="ml-2 rounded-full p-1 hover:bg-pure-canvas/15" aria-label="Close toast">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
