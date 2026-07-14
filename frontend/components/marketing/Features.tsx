import { Fingerprint, Sparkles, Edit3, MessageSquareQuote } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const FEATURES = [
  {
    icon: Fingerprint,
    title: 'Brand Vault',
    body: 'Lưu giọng thương hiệu của bạn một lần. Mỗi bản nháp sinh ra sẽ tự động theo đúng tone thương hiệu.',
    variant: 'green' as const,
  },
  {
    icon: Sparkles,
    title: 'Repurpose thông minh',
    body: 'Một bài viết gốc tạo ra 4+ bản nháp cho LinkedIn, Facebook, X, Threads trong vòng chưa đầy 60 giây.',
    variant: 'blush' as const,
  },
  {
    icon: Edit3,
    title: 'Review workspace',
    body: 'Chỉnh sửa trực tiếp, autosave tự động, copy một chạm hoặc tái tạo bản nháp khi chưa vừa ý.',
    variant: 'sand' as const,
  },
  {
    icon: MessageSquareQuote,
    title: 'Giọng văn nhất quán',
    body: 'Tone of voice thương hiệu được áp dụng xuyên suốt mọi kênh, không bị "AI generic" trộn lẫn.',
    variant: 'orange' as const,
  },
]

export function Features() {
  return (
    <section id="features" className="bg-pure-canvas px-4 py-12 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1180px]">
        <h2 className="text-center font-serif text-3xl text-midnight-ink md:text-4xl">
          Mọi thứ bạn cần để tái sử dụng nội dung
        </h2>
        <p className="mx-auto mt-3 max-w-[640px] text-center text-sm leading-6 text-app-muted md:text-base">
          Bốn tính năng cốt lõi giúp bạn tiết kiệm hàng giờ mỗi tuần.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} variant={feature.variant}>
                <div className="rounded-card bg-pure-canvas/60 p-2.5">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6">{feature.body}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}