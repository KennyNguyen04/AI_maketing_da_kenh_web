'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'

export interface VoiceProfile {
  tone: string[]
  topics: string[]
  signature_phrases: string[]
  avoid: string[]
  sentence_style: string
  avg_sentence_length: number
}

function EditableTags({ label, color, initial, onChange }: { label: string; color: 'blue' | 'green' | 'orange' | 'pink'; initial: string[]; onChange: (items: string[]) => void }) {
  function handleRemove(item: string) {
    const next = initial.filter((candidate) => candidate !== item)
    onChange(next)
  }

  function handleAdd() {
    const cleanLabel = label.split('/')[0].trim()
    const value = window.prompt(`Thêm ${cleanLabel} mới / Add new ${cleanLabel}:`)
    if (value && value.trim()) {
      const trimmed = value.trim()
      if (!initial.includes(trimmed)) {
        onChange([...initial, trimmed])
      }
    }
  }

  return (
    <section>
      <p className="mb-3 text-sm font-medium text-dark-charcoal">{label}</p>
      <div className="flex flex-wrap gap-2">
        {initial.map((item) => (
          <Tag key={item} label={item} color={color} editable onRemove={() => handleRemove(item)} />
        ))}
        <button type="button" onClick={handleAdd} className="rounded-badge border border-light-gray px-3 py-1.5 text-sm text-midnight-ink hover:bg-light-gray/20 transition cursor-pointer">+ Thêm / Add</button>
      </div>
    </section>
  )
}

export function VoiceProfilePreview({ profile, onChange }: { profile: VoiceProfile; onChange: (profile: VoiceProfile) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="space-y-6">
      <EditableTags label="Tone / Giọng điệu" color="blue" initial={profile.tone} onChange={(next) => onChange({ ...profile, tone: next })} />
      <EditableTags label="Chủ đề / Topics" color="green" initial={profile.topics} onChange={(next) => onChange({ ...profile, topics: next })} />
      <EditableTags label="Cụm từ hay dùng / Signature phrases" color="pink" initial={profile.signature_phrases} onChange={(next) => onChange({ ...profile, signature_phrases: next })} />
      <EditableTags label="Nên tránh / Avoid" color="orange" initial={profile.avoid} onChange={(next) => onChange({ ...profile, avoid: next })} />
      <section>
        <p className="mb-3 text-sm font-medium text-dark-charcoal">Độ dài câu / Sentence style</p>
        <select 
          className="rounded-badge border border-light-gray bg-pure-canvas px-4 py-2 text-sm text-midnight-ink" 
          value={profile.sentence_style}
          onChange={(e) => onChange({ ...profile, sentence_style: e.target.value })}
        >
          <option value="short">short</option>
          <option value="medium">medium</option>
          <option value="long">long</option>
          <option value="varied">varied</option>
        </select>
      </section>
      <Card variant="sand" className="p-6">
        <button type="button" onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between text-left text-sm font-medium text-midnight-ink">
          System Prompt được tạo từ Brand Vault của bạn
          <ChevronDown className={expanded ? 'h-4 w-4 rotate-180 transition' : 'h-4 w-4 transition'} />
        </button>
        {expanded ? (
          <pre className="mt-4 whitespace-pre-wrap rounded-card bg-pure-canvas p-4 font-mono text-sm leading-6 text-dark-charcoal">
{`Bạn là trợ lý viết nội dung marketing có phong cách viết cụ thể.
GIỌNG VĂN: ${profile.tone.join(', ')}
ĐỘ DÀI CÂU: Ngắn (~${profile.avg_sentence_length} từ/câu)
CỤM TỪ HAY DÙNG: ${profile.signature_phrases.join(', ')}
CHỦ ĐỀ: ${profile.topics.join(', ')}
TRÁNH: ${profile.avoid.join(', ')}`}
          </pre>
        ) : null}
      </Card>
    </div>
  )
}
