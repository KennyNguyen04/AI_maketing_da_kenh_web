import Link from 'next/link'
import { ProductPreview } from './ProductPreview'

export function Hero() {
  return (
    <section
      id="hero"
      className="bg-[linear-gradient(121deg,#cc7ab5_-80%,#4865ff_36%,#1b1463_103%)] px-4 py-16 text-center md:px-8 md:py-24"
    >
      <span className="inline-flex rounded-badge border border-hint-of-blue bg-hint-of-blue/60 px-3 py-1 text-xs font-medium text-regal-violet">
        AI Marketing · Tiếng Việt · Approval-first
      </span>
      <h1 className="mx-auto mt-5 max-w-[760px] text-4xl font-semibold leading-[1.15] tracking-tight text-pure-canvas md:text-6xl">
        Tái chế một bài viết thành nội dung đa kênh
      </h1>
      <p className="mx-auto mt-5 max-w-[640px] text-base leading-7 text-pure-canvas/90">
        Amplify giúp tạo bản nháp cho LinkedIn, Facebook và X theo Brand Vault của bạn.
        Người dùng luôn xem lại trước khi copy, mở mạng xã hội hoặc xác nhận đăng.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 rounded-button border border-pure-canvas bg-pure-canvas px-5 py-3 text-sm font-medium leading-none text-midnight-ink transition hover:bg-app-bg focus:outline-none focus:ring-2 focus:ring-pure-canvas/40"
        >
          Tạo tài khoản miễn phí
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-button border border-pure-canvas/40 bg-transparent px-5 py-3 text-sm font-medium leading-none text-pure-canvas transition hover:bg-pure-canvas/10 focus:outline-none focus:ring-2 focus:ring-pure-canvas/40"
        >
          Mở dashboard
        </Link>
      </div>
      <ProductPreview />
    </section>
  )
}