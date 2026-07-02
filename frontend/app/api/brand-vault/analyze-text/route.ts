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
    const { text } = body
    const { forceRefresh } = body

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: 'Text must be at least 50 characters' }, { status: 400 })
    }

    // Insert a pending record in brand_vaults
    const { data: vault, error: insertError } = await supabase
      .from('brand_vaults')
      .insert({
        user_id: user.id,
        name: 'My Brand Voice',
        source_type: 'text',
        raw_input: text,
        is_active: false, // Will be set to true by Inngest when done
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create brand vault record' }, { status: 500 })
    }

    // Trigger Inngest background job
    await inngest.send({
      name: 'brand_vault/analyze.text',
      data: {
        text,
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
