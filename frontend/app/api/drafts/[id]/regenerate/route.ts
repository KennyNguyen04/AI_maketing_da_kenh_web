import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { repurposeContentAI } from '@/lib/ai'
import { AiTimeoutError } from '@/lib/ai/client'
import { assertUuid, validationErrorResponse } from '@/lib/validation/api'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: rawId } = await params
    const id = assertUuid(rawId, 'draft_id')

    // 1. Fetch old draft
    const { data: oldDraft, error: draftError } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (draftError || !oldDraft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // 2. Fetch job
    const { data: job, error: jobError } = await supabase
      .from('repurpose_jobs')
      .select('*')
      .eq('id', oldDraft.job_id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // 3. Fetch vault
    const { data: vault, error: vaultError } = await supabase
      .from('brand_vaults')
      .select('system_prompt')
      .eq('id', job.brand_vault_id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (vaultError || !vault) {
      return NextResponse.json({ error: 'Brand vault not found' }, { status: 404 })
    }

    // 4. Generate new content (wrapped with timeout in lib/ai/client.ts)
    const newContent = await repurposeContentAI(vault.system_prompt, job.source_content, oldDraft.channel)

    // 5. Insert new draft first (safer — old draft stays intact if insert fails)
    const { data: newDraft, error: insertError } = await supabase
      .from('drafts')
      .insert({
        job_id: oldDraft.job_id,
        user_id: user.id,
        channel: oldDraft.channel,
        content: newContent,
        is_edited: false,
        is_done: false,
        is_current: true,
        version: oldDraft.version + 1
      })
      .select()
      .single()

    if (insertError || !newDraft) {
      return NextResponse.json({ error: 'Failed to save new draft' }, { status: 500 })
    }

    // 6. Mark old draft inactive only after new draft exists
    await supabase
      .from('drafts')
      .update({ is_current: false })
      .eq('id', oldDraft.id)

    return NextResponse.json({ draft: newDraft })
  } catch (error: unknown) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    if (error instanceof AiTimeoutError) {
      return NextResponse.json(
        { error: 'AI generation timed out. Please try again.', code: 'AI_TIMEOUT' },
        { status: 504 },
      )
    }
    console.error('POST /api/drafts/[id]/regenerate error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
