import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-app-muted/40">404</h1>
        <p className="mt-4 text-lg text-midnight-ink">Không tìm thấy trang</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-button border border-sky-blue bg-sky-blue px-4 py-2 text-sm font-medium text-pure-canvas transition hover:bg-sky-blue/90"
        >
          Về Dashboard
        </Link>
      </div>
    </div>
  )
}