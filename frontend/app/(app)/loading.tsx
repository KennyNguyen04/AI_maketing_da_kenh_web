export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" aria-label="Loading" />
        <p className="text-sm text-gray-500">Đang tải...</p>
      </div>
    </div>
  )
}