'use client'

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
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-pitch-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-[480px] rounded-card border border-app-line bg-pure-canvas p-6 shadow-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <h2 className="text-xl text-midnight-ink">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-dark-charcoal">{body}</p>
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
