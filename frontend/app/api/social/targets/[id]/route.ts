import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { assertUuid, validationErrorResponse } from '@/lib/validation/api'

/**
 * Cookie-auth mirror of /api/extension/targets/[targetId] for the webapp.
 *
 * PATCH: update target (currently only auto_post_enabled via UI)
 * DELETE: soft-delete (set is_active=false) — same as extension route semantics
 */

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
    const targetId = assertUuid(rawId, 'target_id')

    const body = await request.json()
    const allowedFields = ['name', 'is_active', 'auto_post_enabled', 'schedule']
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: target, error: updateError } = await supabaseAdmin
      .from('social_targets')
      .update(updateData)
      .eq('id', targetId)
      .eq('user_id', user.id)
      .select('id, channel, target_id, target_type, name, url, is_active, auto_post_enabled')
      .single()

    if (updateError || !target) {
      console.error('PATCH /api/social/targets/[id] error:', updateError)
      return NextResponse.json({ error: 'Failed to update target' }, { status: 500 })
    }

    return NextResponse.json({ target })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    console.error('PATCH /api/social/targets/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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
    const targetId = assertUuid(rawId, 'target_id')

    // Soft-delete via is_active=false (matches extension route semantics so
    // extension-side queries remain consistent)
    const { error: updateError } = await supabaseAdmin
      .from('social_targets')
      .update({ is_active: false })
      .eq('id', targetId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('DELETE /api/social/targets/[id] error:', updateError)
      return NextResponse.json({ error: 'Failed to delete target' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    console.error('DELETE /api/social/targets/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}