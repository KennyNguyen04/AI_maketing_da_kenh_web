'use client'

import Link from 'next/link'
import { CheckCircle2, Facebook, Fingerprint, Linkedin, PenLine, Twitter } from 'lucide-react'
import { Card } from '@/components/ui/Card'

function ProductPreview() {
  const channels = [
    { icon: Linkedin, label: 'LinkedIn', text: 'Bài post chuyên nghiệp, giữ đúng giọng thương hiệu.' },
    { icon: Facebook, label: 'Facebook', text: 'Bản kể chuyện dễ đọc cho Page.' },
    { icon: Twitter, label: 'X', text: 'Hook ngắn, rõ, sẵn sàng copy.' },
  ]

  return (
    <Card className="mx-auto mt-10 max-w-[960px] p-0 text-left">
      <div className="grid md:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-app-line p-5 md:border-b-0 md:border-r">
          <p className="text-xs font-medium uppercase tracking-wide text-app-muted">Source</p>
          <h3 className="mt-3 text-lg text-midnight-ink">Một bài viết dài về chiến dịch marketing</h3>
          <p className="mt-3 text-sm leading-6 text-dark-charcoal">
            Amplify đọc nội dung gốc, áp dụng Brand Vault và tạo bản nháp phù hợp cho từng kênh.
          </p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {channels.map((channel) => {
            const Icon = channel.icon
            return (
              <div key={channel.label} className="rounded-card border border-app-line bg-app-bg p-4">
                <Icon className="h-5 w-5 text-sky-blue" />
                <p className="mt-3 text-sm font-semibold text-midnight-ink">{channel.label}</p>
                <p className="mt-2 text-xs leading-5 text-app-muted">{channel.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export default function LandingPage() {
  return (
    <main className="bg-app-bg">
      <nav className="sticky top-0 z-40 border-b border-app-line bg-pure-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3 md:px-8">
          <Link href="/" className="text-xl font-semibold text-midnight-ink">Amplify</Link>
          <div className="flex gap-2">
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

      <section className="px-4 py-16 text-center md:px-8 md:py-24">
        <span className="inline-flex rounded-badge border border-hint-of-blue bg-hint-of-blue/60 px-3 py-1 text-xs font-medium text-regal-violet">
          AI Marketing · Tiếng Việt · Approval-first
        </span>
        <h1 className="mx-auto mt-5 max-w-[760px] text-4xl leading-tight text-midnight-ink md:text-6xl">
          Tái chế một bài viết thành nội dung đa kênh
        </h1>
        <p className="mx-auto mt-5 max-w-[640px] text-base leading-7 text-dark-charcoal">
          Amplify giúp tạo bản nháp cho LinkedIn, Facebook và X theo Brand Vault của bạn. Người dùng luôn xem lại trước khi copy, mở mạng xã hội hoặc xác nhận đăng.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 rounded-button border border-sky-blue bg-sky-blue px-5 py-3 text-sm font-medium leading-none text-pure-canvas transition hover:bg-sky-blue/90 focus:outline-none focus:ring-2 focus:ring-sky-blue/25"
          >
            Tạo tài khoản miễn phí
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-button border border-app-line bg-pure-canvas px-5 py-3 text-sm font-medium leading-none text-midnight-ink transition hover:border-sky-blue/40 hover:bg-hint-of-blue/35 focus:outline-none focus:ring-2 focus:ring-sky-blue/25"
          >
            Mở dashboard
          </Link>
        </div>
        <ProductPreview />
      </section>

      <section className="border-y border-app-line bg-pure-canvas px-4 py-12 md:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-4 md:grid-cols-3">
          {[
            { icon: Fingerprint, title: 'Brand Vault', body: 'Lưu giọng thương hiệu để mỗi bản nháp nhất quán hơn.' },
            { icon: PenLine, title: 'Review workspace', body: 'Chỉnh sửa, autosave, copy và tạo lại từng bản nháp.' },
            { icon: CheckCircle2, title: 'Prepare trước khi đăng', body: 'Mở preview cho X, Facebook, LinkedIn trước khi người dùng quyết định.' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.title}>
                <Icon className="h-6 w-6 text-sky-blue" />
                <h2 className="mt-4 text-lg text-midnight-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-app-muted">{item.body}</p>
              </Card>
            )
          })}
        </div>
      </section>

      <footer className="px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 text-sm text-app-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-midnight-ink">Amplify</p>
          <p>Dự án tốt nghiệp · AI Marketing đa kênh</p>
        </div>
      </footer>
    </main>
  )
}
