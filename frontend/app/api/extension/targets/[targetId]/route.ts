import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/extension/targets/[targetId]
 * Get a specific target
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ targetId: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetId } = await params

    const { data: target, error } = await supabase
      .from('social_targets')
      .select('*')
      .eq('id', targetId)
      .eq('user_id', user.id)
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
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const { data: target, error: updateError } = await supabase
      .from('social_targets')
      .update(updateData)
      .eq('id', targetId)
      .eq('user_id', user.id)
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
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetId } = await params

    const { error: deleteError } = await supabase
      .from('social_targets')
      .delete()
      .eq('id', targetId)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete target' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/extension/targets/[targetId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
