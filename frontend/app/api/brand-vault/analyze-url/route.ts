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

    // Insert a pending record in brand_vaults.
    // NOTE: We deliberately omit `display_name` here so the insert works
    // on databases that haven't run migration 003 (no column) as well as
    // those that have (column will fall back to its DEFAULT). Migration
    // 017 backfills any nulls with `name` and ensures a DEFAULT exists.
    const { data: vault, error: insertError } = await supabase
      .from('brand_vaults')
      .insert({
        user_id: user.id,
        name: 'My Brand Voice',
        source_type: 'url',
        raw_input: url,
        is_active: false,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json(
        {
          error: 'Failed to create brand vault record',
          detail: insertError.message,
          code: insertError.code,
        },
        { status: 500 },
      )
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
