import { Timer, Bot, CalendarX } from 'lucide-react'
import { Card } from '@/components/ui/Card'

const PAIN_POINTS = [
  {
    icon: Timer,
    title: 'Sáng 30 phút cho 1 bài LinkedIn',
    body: 'Bạn ngồi cả tiếng để tái viết một bài dài cho LinkedIn, Facebook, X… khi chỉ cần dán URL gốc là xong.',
  },
  {
    icon: Bot,
    title: 'AI xong, vẫn phải tự đăng',
    body: 'AI tạo bản nháp hay, nhưng bạn vẫn phải copy thủ công sang từng mạng xã hội và chỉnh lại từng chỗ.',
  },
  {
    icon: CalendarX,
    title: 'Lịch rối, lại quên đăng',
    body: 'Bạn quên mất không đăng bài đã lên lịch, hoặc đăng trễ giờ vàng — engagement tụt mà không biết tại sao.',
  },
]

export function PainPoints() {
  return (
    <section id="pain-points" className="border-y border-app-line bg-pure-canvas px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-[1180px]">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-midnight-ink md:text-4xl">
          Bạn đang gặp vấn đề này?
        </h2>
        <p className="mx-auto mt-3 max-w-[640px] text-center text-sm leading-6 text-app-muted md:text-base">
          Tái sử dụng nội dung là nhu cầu thật, nhưng công cụ hiện tại vẫn chưa giải quyết trọn vẹn.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PAIN_POINTS.map((point) => {
            const Icon = point.icon
            return (
              <Card key={point.title} variant="sand">
                <div className="rounded-card bg-sunset-orange/10 p-3 text-sunset-orange">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-midnight-ink">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-app-muted">{point.body}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}