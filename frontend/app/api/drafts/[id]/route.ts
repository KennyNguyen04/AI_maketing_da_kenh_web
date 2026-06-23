import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertUuid, validateDraftContent, validationErrorResponse } from '@/lib/validation/api'

export async function PATCH(
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
    const body = await request.json()

    // Create update object dynamically based on allowed fields
    const updates: Record<string, string | boolean> = {
      updated_at: new Date().toISOString()
    }
    if (typeof body.content === 'string') {
      updates.content = validateDraftContent(body.content)
      updates.is_edited = true
    }
    if (typeof body.is_done === 'boolean') {
      updates.is_done = body.is_done
    }

    const { data, error } = await supabase
      .from('drafts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update draft:', error)
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 })
    }

    return NextResponse.json({ draft: data })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    console.error('PATCH /api/drafts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
