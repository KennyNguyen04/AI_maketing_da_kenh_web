'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from './Button'

export interface ModalProps {
  isOpen: boolean
  title: string
  body: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onClose: () => void
}

export function Modal({ isOpen, title, body, confirmLabel, confirmVariant = 'primary', onConfirm, onClose }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = 'modal-title'
  const bodyId = 'modal-body'

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    // Focus the modal container for screen readers
    setTimeout(() => modalRef.current?.focus(), 0)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            className="w-full max-w-[480px] rounded-card border border-app-line bg-pure-canvas p-6 shadow-lg outline-none"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="text-xl text-midnight-ink">{title}</h2>
            <p id={bodyId} className="mt-3 text-sm leading-6 text-dark-charcoal">{body}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>Hủy</Button>
              <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
