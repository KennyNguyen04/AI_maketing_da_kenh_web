'use client'

import { useEffect } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error('App Route Error captured:', error)
  }, [error])

  // Custom fallback to bind the Next.js reset function to the ErrorBoundary UI
  const customFallback = (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-[600px] rounded-card border border-sunset-orange/20 bg-pure-canvas p-10 shadow-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sunset-orange/10 text-vibrant-orange animate-pulse">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="mt-6 text-2xl font-semibold text-midnight-ink">
          Đã xảy ra sự cố trong ứng dụng
        </h2>
        <p className="mt-2 text-sm text-dark-charcoal font-medium">
          An unexpected error occurred in this section
        </p>
        
        <p className="mt-4 text-sm text-light-gray max-w-md mx-auto">
          Hệ thống gặp lỗi trong quá trình xử lý giao diện. Bạn có thể nhấn nút dưới đây để thử lại tính năng này.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <button
            type="button"
            onClick={() => window.location.href = '/dashboard'}
            className="inline-flex items-center justify-center gap-2 rounded-button border border-midnight-ink bg-transparent px-6 py-3 font-medium text-midnight-ink transition hover:bg-midnight-ink/5"
          >
            Về Dashboard / Home
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-button border border-pure-canvas bg-sky-blue px-6 py-3 font-medium text-pure-canvas shadow-sm hover:brightness-95 hover:shadow-md"
          >
            Thử lại ngay / Try again
          </button>
        </div>

        {error && (
          <div className="mt-8 text-left border-t border-muted-stone pt-6">
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-sky-blue outline-none group-open:underline">
                Xem chi tiết lỗi / View technical details
              </summary>
              <div className="mt-3 max-h-[160px] overflow-auto rounded bg-warm-sand p-4 font-mono text-[11px] text-vibrant-orange border border-muted-stone">
                <p className="font-semibold">{error.name}: {error.message}</p>
                {error.digest && <p className="mt-1 opacity-80">Digest: {error.digest}</p>}
                {error.stack && <pre className="mt-2 whitespace-pre-wrap text-dark-charcoal opacity-70">{error.stack}</pre>}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )

  return <ErrorBoundary fallback={customFallback}>{null}</ErrorBoundary>
}
