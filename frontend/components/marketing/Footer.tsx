import Link from 'next/link'

const PRODUCT_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/vaults', label: 'Brand Vault' },
  { href: '/scheduler', label: 'Scheduler' },
  { href: '/analytics', label: 'Analytics' },
]

const RESOURCE_LINKS = [
  { href: '/onboarding', label: 'Hướng dẫn bắt đầu' },
  { href: '/settings', label: 'Cài đặt Extension' },
  { href: '/login', label: 'Đăng nhập' },
  { href: '/register', label: 'Đăng ký' },
]

export function Footer() {
  return (
    <footer id="footer" className="bg-deep-moss px-4 py-10 text-pure-canvas md:px-8 md:py-14">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-serif text-xl">Amplify</p>
            <p className="mt-2 text-sm leading-6 text-pure-canvas/70">
              Tái chế một bài viết thành nội dung đa kênh. Duyệt trước, đăng sau — theo cách bạn muốn.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pure-canvas/70">
              Sản phẩm
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-pure-canvas/90 hover:text-pure-canvas">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-pure-canvas/70">
              Tài nguyên
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-pure-canvas/90 hover:text-pure-canvas">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-pure-canvas/15 pt-6 text-xs text-pure-canvas/60">
          © 2026 Amplify · Dự án tốt nghiệp · AI Marketing đa kênh
        </div>
      </div>
    </footer>
  )
}