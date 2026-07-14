import Link from 'next/link'

export function CTABanner() {
  return (
    <section
      id="cta"
      className="bg-[linear-gradient(121deg,#cc7ab5_-80%,#4865ff_36%,#1b1463_103%)] px-4 py-12 text-center md:px-8 md:py-20"
    >
      <div className="mx-auto max-w-[860px]">
        <h2 className="font-serif text-3xl leading-tight text-pure-canvas md:text-5xl">
          Sẵn sàng tái chế bài viết cho mọi kênh?
        </h2>
        <p className="mx-auto mt-4 max-w-[640px] text-base leading-7 text-pure-canvas/90">
          Đăng ký miễn phí — không cần thẻ tín dụng. Bắt đầu trong 60 giây.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 rounded-button border border-pure-canvas bg-pure-canvas px-6 py-3 text-sm font-medium leading-none text-midnight-ink transition hover:bg-app-bg focus:outline-none focus:ring-2 focus:ring-pure-canvas/40"
          >
            Tạo tài khoản miễn phí
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-button border border-pure-canvas/40 bg-transparent px-6 py-3 text-sm font-medium leading-none text-pure-canvas transition hover:bg-pure-canvas/10 focus:outline-none focus:ring-2 focus:ring-pure-canvas/40"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </section>
  )
}