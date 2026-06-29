import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { verifyToken } from '../../_auth'

/**
 * GET /api/extension/targets/[targetId]
 * Get a specific target
 *
 * Auth: Bearer API token (verified via api_keys table hash).
 * Uses service-role client because Bearer-token requests have no Supabase session.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ targetId: string }> }
) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { targetId } = await params

    const { data: target, error } = await supabaseAdmin
      .from('social_targets')
      .select('*')
      .eq('id', targetId)
      .eq('user_id', userId)
      .single()

    if (error || !target) {
      return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    }

    return NextResponse.json({ target })
  } catch (error) {
    console.error('GET /api/extension/targets/[targetId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/extension/targets/[targetId]
 * Update a target
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ targetId: string }> }
) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { targetId } = await params
    const body = await request.json()

    // Only allow updating specific fields
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
      .eq('user_id', userId)
      .select('*')
      .single()

    if (updateError || !target) {
      return NextResponse.json({ error: 'Failed to update target' }, { status: 500 })
    }

    return NextResponse.json({ target })
  } catch (error) {
    console.error('PATCH /api/extension/targets/[targetId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/extension/targets/[targetId]
 * Remove a target
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ targetId: string }> }
) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { targetId } = await params

    const { error: deleteError } = await supabaseAdmin
      .from('social_targets')
      .delete()
      .eq('id', targetId)
      .eq('user_id', userId)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete target' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/extension/targets/[targetId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}