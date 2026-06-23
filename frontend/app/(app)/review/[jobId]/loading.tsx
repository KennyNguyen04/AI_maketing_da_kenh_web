import { Skeleton } from '@/components/ui/Skeleton'

export default function ReviewLoading() {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <header className="mb-8">
        <Skeleton variant="text" className="mb-4 h-5 w-32" />
        <Skeleton variant="text" className="mb-3 h-10 w-1/2" />
        <Skeleton variant="text" className="h-5 w-1/4" />
      </header>

      {/* 2-Column Advanced Layout Skeleton */}
      <div className="grid grid-cols-[320px_1fr] items-start gap-8">
        {/* Left Side: Source panel */}
        <Skeleton variant="card" className="h-[460px] w-full" />
        
        {/* Right Side: Channels and Editor */}
        <section className="space-y-6">
          <div className="flex gap-2">
             <Skeleton variant="card" className="h-10 w-32 rounded-badge" />
             <Skeleton variant="card" className="h-10 w-32 rounded-badge" />
             <Skeleton variant="card" className="h-10 w-32 rounded-badge" />
          </div>
          <Skeleton variant="card" className="h-[320px] w-full" />
        </section>
      </div>

      {/* Sticky Bottom Actions Skeleton */}
      <div className="mt-10 flex items-center justify-between border-t border-muted-stone bg-pure-canvas/95 px-2 py-6">
        <Skeleton variant="text" className="h-4 w-60" />
        <Skeleton variant="card" className="h-12 w-48 rounded-button" />
      </div>
    </div>
  )
}
