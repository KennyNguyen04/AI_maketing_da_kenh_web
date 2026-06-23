import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Title & Actions Section */}
      <div className="mb-10 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-10 w-64" />
          <Skeleton variant="text" className="h-4 w-80" />
        </div>
        <Skeleton variant="card" className="h-12 w-44 rounded-button" />
      </div>

      {/* Brand Vault Status Loader */}
      <Skeleton variant="card" className="h-24 w-full" />

      {/* 3-Column Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton variant="card" className="h-28 w-full" />
        <Skeleton variant="card" className="h-28 w-full" />
        <Skeleton variant="card" className="h-28 w-full" />
      </div>

      {/* History Header */}
      <div className="mt-10 mb-6 flex items-center justify-between">
        <Skeleton variant="text" className="h-8 w-72" />
        <Skeleton variant="text" className="h-4 w-28" />
      </div>

      {/* JobList Skeletons */}
      <div className="space-y-3">
        {/* Table header outline */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_120px] px-4 py-2 border-b border-muted-stone">
          <Skeleton variant="text" className="h-3 w-20" />
          <Skeleton variant="text" className="h-3 w-16" />
          <Skeleton variant="text" className="h-3 w-12" />
          <Skeleton variant="text" className="h-3 w-16" />
          <span />
        </div>
        
        {/* Skeletons for JobCards */}
        <Skeleton variant="card" className="h-20 w-full" />
        <Skeleton variant="card" className="h-20 w-full" />
        <Skeleton variant="card" className="h-20 w-full" />
      </div>
    </div>
  )
}
