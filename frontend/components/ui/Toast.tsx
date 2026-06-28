'use client'

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
}

interface ToastContextValue {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  function addToast(toast: Omit<ToastItem, 'id'>) {
    const id = Math.random().toString(36).slice(2, 10)
    const duration = toast.duration ?? 4000

    setToasts((prev) => [...prev, { ...toast, id, duration }])

    const timer = setTimeout(() => {
      removeToast(id)
    }, duration)

    timers.current.set(id, timer)
  }

  function removeToast(id: string) {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex max-w-[360px] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
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
  const Icon = icons[toast.type]

  return (
    <motion.div
      className={clsx('flex items-center gap-3 rounded-card border px-4 py-3 text-sm font-medium shadow-lg', styles[toast.type])}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1">{toast.message}</span>
      <button type="button" onClick={onClose} className="ml-2 rounded-full p-1 hover:bg-pure-canvas/15" aria-label="Close toast">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

interface ToastProps {
  type: 'success' | 'error' | 'info'
  message: string
  isVisible: boolean
  onClose: () => void
}

export function Toast({ type, message, isVisible, onClose }: ToastProps) {
  if (!isVisible) return null

  return (
    <ToastProvider>
      <ToastItemComponent type={type} message={message} onClose={onClose} />
    </ToastProvider>
  )
}

function ToastItemComponent({ type, message, onClose }: { type: 'success' | 'error' | 'info'; message: string; onClose: () => void }) {
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
    <motion.div
      className={clsx('flex items-center gap-3 rounded-card border px-4 py-3 text-sm font-medium shadow-lg', styles[type])}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      <button type="button" onClick={onClose} className="ml-2 rounded-full p-1 hover:bg-pure-canvas/15" aria-label="Close toast">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}
