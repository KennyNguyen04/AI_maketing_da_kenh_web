'use client'

import { Channel } from '@/lib/types'
import { CHANNEL_LABELS } from '@/lib/constants'
import { Tabs } from '@/components/ui/Tabs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DraftTabs({ drafts, active, onChange }: { drafts: any[]; active: Channel; onChange: (channel: Channel) => void }) {
  return (
    <Tabs
      activeId={active}
      onChange={(id) => onChange(id as Channel)}
      items={drafts.map((draft) => {
        return {
          id: draft.channel,
          label: CHANNEL_LABELS[draft.channel as keyof typeof CHANNEL_LABELS] || draft.channel,
        }
      })}
    />
  )
}

