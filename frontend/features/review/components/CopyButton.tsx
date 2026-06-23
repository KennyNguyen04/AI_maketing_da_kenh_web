'use client'

import { useState } from 'react'
import { CheckCircle2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function CopyButton({ text, onCopied }: { text: string; onCopied: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copyText() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    onCopied()
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant={copied ? 'green' : 'ghost'} size="sm" onClick={copyText}>
      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Đã sao chép' : 'Sao chép'}
    </Button>
  )
}
