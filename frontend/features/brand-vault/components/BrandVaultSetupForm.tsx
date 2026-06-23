'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function PillGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={clsx('rounded-badge border px-4 py-2 text-sm transition', value === option ? 'border-sky-blue bg-sky-blue text-pure-canvas' : 'border-light-gray bg-pure-canvas text-dark-charcoal')}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export function BrandVaultSetupForm({ onSubmit }: { onSubmit: (data: { topics: string; tone: string; audience: string; style: string; samples: string }) => void }) {
  const [topics, setTopics] = useState('')
  const [tone, setTone] = useState('Chuyên nghiệp / Professional')
  const [audience, setAudience] = useState('')
  const [style, setStyle] = useState('Kể chuyện / Storytelling')
  const [samples, setSamples] = useState('')

  const isFormValid = topics.trim() !== '' && audience.trim() !== ''

  return (
    <div className="mt-8 space-y-5">
      <Input type="textarea" label="Bạn thường viết về chủ đề gì? / What do you write about?" value={topics} onChange={setTopics} required />
      <div>
        <p className="mb-2 text-sm font-medium text-midnight-ink">Giọng văn của bạn thiên về? / Your writing tone?</p>
        <PillGroup options={['Chuyên nghiệp / Professional', 'Gần gũi / Friendly', 'Hài hước / Humorous', 'Trực tiếp / Direct']} value={tone} onChange={setTone} />
      </div>
      <Input label="Đối tượng đọc của bạn là? / Your target audience?" value={audience} onChange={setAudience} required />
      <div>
        <p className="mb-2 text-sm font-medium text-midnight-ink">Bạn thường dùng văn phong nào? / Writing style?</p>
        <PillGroup options={['Học thuật / Academic', 'Kể chuyện / Storytelling', 'Bullet points', 'Hỗn hợp / Mixed']} value={style} onChange={setStyle} />
      </div>
      <Input type="textarea" label="Paste 1-3 câu mẫu bạn thích / Sample sentences" value={samples} onChange={setSamples} />
      <Button className="w-full" disabled={!isFormValid} onClick={() => onSubmit({ topics, tone, audience, style, samples })}>Tạo Brand Vault / Create Brand Vault -&gt;</Button>
    </div>
  )
}
