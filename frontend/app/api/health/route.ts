import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()
  const checks: Record<string, { ok: boolean; detail?: string; duration_ms?: number }> = {}

  // 1. Env validation
  const env = validateEnv()
  checks.env = { ok: env.ok, detail: env.errors.join('; ') || undefined }

  // 2. Database connectivity
  try {
    const supabase = await createClient()
    const dbStart = Date.now()
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    checks.db = {
      ok: !error,
      detail: error?.message,
      duration_ms: Date.now() - dbStart,
    }
  } catch (error) {
    checks.db = { ok: false, detail: error instanceof Error ? error.message : String(error) }
  }

  // 3. Critical tables existence (probes schema-level access)
  try {
    const supabase = await createClient()
    const tables = ['drafts', 'repurpose_jobs', 'social_targets', 'extension_tasks', 'brand_vaults']
    const tableChecks = await Promise.all(
      tables.map(async (t) => {
        const { error } = await supabase.from(t).select('id', { count: 'exact', head: true }).limit(1)
        return { table: t, ok: !error, error: error?.message }
      }),
    )
    const failedTables = tableChecks.filter((t) => !t.ok)
    checks.schema = {
      ok: failedTables.length === 0,
      detail: failedTables.length ? failedTables.map((t) => `${t.table}: ${t.error}`).join('; ') : `${tables.length} tables reachable`,
    }
  } catch (error) {
    checks.schema = { ok: false, detail: error instanceof Error ? error.message : String(error) }
  }

  const allOk = Object.values(checks).every((c) => c.ok)
  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      checks,
    },
    { status: allOk ? 200 : 503 },
  )
}
