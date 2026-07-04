import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { url } = body
    const { forceRefresh } = body

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'Valid URL is required' }, { status: 400 })
    }

    // Insert a pending record in brand_vaults
    // Provide display_name to satisfy the NOT NULL constraint added in
    // migration 003 (the column was added later than the original schema).
    // Without this, the insert would fail with "null value in column
    // 'display_name' violates not-null constraint" on any DB where the
    // migration has been applied. Defaulting to `name` keeps existing
    // dashboard / NewJobForm display logic working unchanged.
    const { data: vault, error: insertError } = await supabase
      .from('brand_vaults')
      .insert({
        user_id: user.id,
        name: 'My Brand Voice',
        display_name: 'My Brand Voice',
        source_type: 'url',
        raw_input: url,
        is_active: false,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create brand vault record' }, { status: 500 })
    }

    // Trigger Inngest background job
    await inngest.send({
      name: 'brand_vault/analyze.url',
      data: {
        url,
        userId: user.id,
        vaultId: vault.id,
        forceRefresh: !!forceRefresh,
      }
    })

    return NextResponse.json({ vaultId: vault.id, status: 'processing' })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
