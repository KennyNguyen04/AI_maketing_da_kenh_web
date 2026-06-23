'use client'

import { useState } from 'react'
import { CheckSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function MarkDoneButton({ onDone, allDone = false }: { onDone: () => Promise<void>; allDone?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(allDone)

  async function toggle() {
    if (loading) return
    setLoading(true)
    try {
      await onDone()
      setDone(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant={done ? 'green' : 'ghost'} onClick={toggle} disabled={loading || done}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="h-4 w-4" />}
      {done ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
    </Button>
  )
}
