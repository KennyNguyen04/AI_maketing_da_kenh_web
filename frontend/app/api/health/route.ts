import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const startedAt = Date.now()
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    return NextResponse.json({
      status: error ? 'degraded' : 'ok',
      db: error ? 'error' : 'connected',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      error: error?.message,
    }, { status: error ? 503 : 200 })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      db: 'unknown',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
