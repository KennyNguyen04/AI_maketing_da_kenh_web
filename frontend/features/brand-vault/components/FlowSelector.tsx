'use client'

import { FileText, MessageSquare } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@/components/ui/Card'

export type OnboardingFlow = 'content' | 'fresh'

export function FlowSelector({ value, onChange }: { value: OnboardingFlow; onChange: (value: OnboardingFlow) => void }) {
  const cards = [
    {
      id: 'content' as const,
      icon: FileText,
      color: 'text-sky-blue',
      title: 'Tôi có bài viết sẵn',
      subtitle: 'Dán URL blog hoặc text bài viết cũ',
      tag: 'Nhanh nhất / Fastest',
    },
    {
      id: 'fresh' as const,
      icon: MessageSquare,
      color: 'text-sunset-orange',
      title: 'Tôi chưa có gì',
      subtitle: 'Trả lời 5 câu hỏi nhanh về phong cách viết',
      tag: 'Cold Start / 3 phút',
    },
  ]

  return (
    <div role="radiogroup" aria-label="Chọn cách tạo Brand Vault" className="grid grid-cols-2 gap-6">
      {cards.map((card) => {
        const Icon = card.icon
        const selected = value === card.id
        return (
          <button
            key={card.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(card.id)}
            className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-blue/40 rounded-card"
          >
            <Card className={clsx('h-full border transition hover:-translate-y-1', selected ? 'border-2 border-sky-blue' : 'border-light-gray')}>
              <Icon className={clsx('h-10 w-10', card.color)} aria-hidden="true" />
              <h3 className="mt-5 text-2xl text-midnight-ink">{card.title}</h3>
              <p className="mt-2 text-sm text-dark-charcoal">{card.subtitle}</p>
              <span className="mt-5 inline-flex rounded-badge bg-hint-of-blue px-3 py-1 text-xs font-medium text-regal-violet">{card.tag}</span>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
