'use client'

import { Button } from './Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './Dialog'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reusable confirmation modal. Wraps Radix Dialog with two-action layout.
 *
 * Use case: destructive actions (delete) — replaces window.confirm() so
 * styling matches the rest of the app and i18n is consistent.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButton = (
    <Button
      variant={variant === 'danger' ? 'danger' : 'primary'}
      onClick={onConfirm}
      disabled={loading}
    >
      {loading ? 'Đang xử lý...' : confirmText}
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          {confirmButton}
        </div>
      </DialogContent>
    </Dialog>
  )
}
