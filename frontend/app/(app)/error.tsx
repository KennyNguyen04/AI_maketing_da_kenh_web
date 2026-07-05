'use client'

import { useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app-error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-md p-6 text-center">
        <h2 className="text-lg font-semibold text-vibrant-orange">Đã xảy ra lỗi</h2>
        <p className="mt-2 text-sm text-dark-charcoal">
          {error.message || 'Có lỗi xảy ra khi tải trang này. Vui lòng thử lại.'}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-app-muted">Mã lỗi: {error.digest}</p>
        )}
        <div className="mt-4 flex justify-center">
          <Button variant="danger" onClick={reset}>Thử lại</Button>
        </div>
      </Card>
    </div>
  )
}