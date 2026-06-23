'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export function RegenerateButton({ onRegenerate, disabled }: { onRegenerate: () => void, disabled?: boolean }) {
  const [open, setOpen] = useState(false)

  function confirm() {
    setOpen(false)
    onRegenerate()
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <RefreshCw className={disabled ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Tạo lại
      </Button>
      <Modal
        isOpen={open}
        title="Tạo lại bản nháp?"
        body="Bản nháp hiện tại sẽ được thay bằng phiên bản mới. Hành động này không thể hoàn tác."
        confirmLabel="Tạo lại"
        onClose={() => setOpen(false)}
        onConfirm={confirm}
      />
    </>
  )
}
