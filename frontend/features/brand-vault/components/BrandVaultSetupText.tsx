'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'

export function BrandVaultSetupText({ onSubmit }: { onSubmit: (mode: string, value: string) => void }) {
  const [mode, setMode] = useState('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')

  return (
    <div className="mt-8 space-y-4">
      <Tabs
        items={[
          { id: 'url', label: 'Dán URL / Paste URL' },
          { id: 'text', label: 'Dán text / Paste text' },
        ]}
        activeId={mode}
        onChange={setMode}
      />
      {mode === 'url' ? (
        <Input type="url" label="URL bài viết" placeholder="https://yourblog.com/your-post" value={url} onChange={setUrl} />
      ) : (
        <Input type="textarea" rows={8} label="Nội dung bài viết" placeholder="Dán 1-3 bài viết của bạn vào đây..." value={text} onChange={setText} />
      )}
      <p className="text-xs text-light-gray">AI sẽ phân tích giọng văn và tạo profile thương hiệu cho bạn.</p>
      <Button className="w-full" disabled={mode === 'url' ? !url : text.length < 50} onClick={() => onSubmit(mode, mode === 'url' ? url : text)}>Phân tích giọng văn / Analyze voice -&gt;</Button>
    </div>
  )
}
