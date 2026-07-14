import { Card } from '@/components/ui/Card'
import { Facebook, Linkedin, Twitter } from 'lucide-react'

export function ProductPreview() {
  const channels = [
    {
      icon: Linkedin,
      label: 'LinkedIn',
      text: 'Bài post chuyên nghiệp, giữ đúng giọng thương hiệu.',
    },
    {
      icon: Facebook,
      label: 'Facebook',
      text: 'Bản kể chuyện dễ đọc cho Page.',
    },
    {
      icon: Twitter,
      label: 'X',
      text: 'Hook ngắn, rõ, sẵn sàng copy.',
    },
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