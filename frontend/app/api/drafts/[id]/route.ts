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
      .eq('is_deleted', false)
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

/**
 * DELETE /api/drafts/[id]
 * Soft delete a single draft. The DB row is kept for audit but hidden
 * from user UI (is_deleted = true).
 *
 * Block list:
 *   - Draft has a pending or processing extension_task (user must cancel
 *     the scheduled post first via /api/schedule/[draftId] cancel).
 */
export async function DELETE(
  _request: Request,
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

    const { data: draft } = await supabase
      .from('drafts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const { count: pendingTasks } = await supabase
      .from('extension_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('draft_id', id)
      .in('status', ['pending', 'processing'])

    if ((pendingTasks || 0) > 0) {
      return NextResponse.json(
        { error: 'Bản nháp đang được Extension xử lý. Hãy huỷ lịch trước khi xoá.' },
        { status: 409 },
      )
    }

    const { error } = await supabase
      .from('drafts')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to soft-delete draft:', error)
      return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    console.error('DELETE /api/drafts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
