'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app-error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-700">Đã xảy ra lỗi</h2>
        <p className="mt-2 text-sm text-red-600">
          {error.message || 'Có lỗi xảy ra khi tải trang này. Vui lòng thử lại.'}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-red-400">Mã lỗi: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}