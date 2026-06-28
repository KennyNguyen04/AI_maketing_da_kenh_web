'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="vi">
      <body className="bg-pure-canvas text-midnight-ink">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold">Đã xảy ra lỗi không mong muốn</h1>
            <p className="text-dark-charcoal">Vui lòng thử tải lại trang.</p>
            <p className="mt-2 rounded-md bg-sunset-orange/10 p-3 text-sm text-sunset-orange">
              {error.message || 'Unknown error'}
            </p>
          </div>
          <Button onClick={reset}>Thử lại</Button>
        </div>
      </body>
    </html>
  )
}
