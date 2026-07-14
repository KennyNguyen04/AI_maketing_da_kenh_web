import { redirect } from 'next/navigation'
import { MessageSquare, Bug, Lightbulb, AlertCircle, Heart } from 'lucide-react'
import { FeedbackForm } from '@/features/feedback/components/FeedbackForm'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'

const FEEDBACK_TYPE_INFO = [
  {
    type: 'general',
    icon: MessageSquare,
    title: 'Phản hồi chung',
    description: 'Chia sẻ ý kiến, đề xuất hoặc câu hỏi về Amplify',
    color: 'text-sky-blue',
  },
  {
    type: 'bug',
    icon: Bug,
    title: 'Báo lỗi',
    description: 'Thông báo lỗi kỹ thuật hoặc hành vi không như mong đợi',
    color: 'text-sunset-orange',
  },
  {
    type: 'feature',
    icon: Lightbulb,
    title: 'Yêu cầu tính năng',
    description: 'Đề xuất tính năng mới bạn muốn thấy trong Amplify',
    color: 'text-amber-500',
  },
  {
    type: 'complaint',
    icon: AlertCircle,
    title: 'Khiếu nại',
    description: 'Báo cáo vấn đề nghiêm trọng hoặc trải nghiệm không tốt',
    color: 'text-red-500',
  },
  {
    type: 'praise',
    icon: Heart,
    title: 'Khen ngợi',
    description: 'Cho chúng tôi biết điều gì bạn thích về Amplify',
    color: 'text-forest-fern',
  },
]

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-app-muted">Phản hồi</p>
        <h1 className="mt-1 text-2xl text-midnight-ink md:text-3xl">Gửi phản hồi</h1>
        <p className="mt-2 max-w-[760px] text-sm leading-6 text-dark-charcoal">
          Chúng tôi luôn lắng nghe ý kiến của bạn. Phản hồi của bạn giúp Amplify trở nên tốt hơn mỗi ngày.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FeedbackForm variant="card" />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-midnight-ink">Loại phản hồi</h2>
          <div className="space-y-3">
            {FEEDBACK_TYPE_INFO.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.type} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg bg-current/10 p-2 ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-midnight-ink">{item.title}</h3>
                      <p className="mt-0.5 text-xs text-app-muted">{item.description}</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <Card variant="green" className="mt-6">
            <h3 className="text-sm font-medium text-deep-moss">Phản hồi ẩn danh</h3>
            <p className="mt-1 text-xs text-deep-moss/80">
              Bạn có thể gửi phản hồi ẩn danh. Chúng tôi chỉ thu thập email nếu bạn muốn nhận phản hồi từ chúng tôi.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
