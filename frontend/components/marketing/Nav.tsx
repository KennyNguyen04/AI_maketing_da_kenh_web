import Link from 'next/link'

export function Nav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-app-line bg-pure-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="text-xl font-semibold text-midnight-ink">
          Amplify
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-button border border-app-line bg-pure-canvas px-3 py-2 text-sm font-medium leading-none text-midnight-ink transition hover:border-sky-blue/40 hover:bg-hint-of-blue/35 focus:outline-none focus:ring-2 focus:ring-sky-blue/25"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 rounded-button border border-sky-blue bg-sky-blue px-3 py-2 text-sm font-medium leading-none text-pure-canvas transition hover:bg-sky-blue/90 focus:outline-none focus:ring-2 focus:ring-sky-blue/25"
          >
            Bắt đầu
          </Link>
        </div>
      </div>
    </nav>
  )
}