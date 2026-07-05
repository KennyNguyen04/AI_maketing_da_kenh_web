import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { owns, isUploadId } from '@/lib/media-store'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { draftId } = await params
    const body = await request.json()
    const { scheduledFor, imageRefs } = body

    if (!scheduledFor) {
      return NextResponse.json(
        { error: 'scheduledFor is required' },
        { status: 400 }
      )
    }

    const scheduledDate = new Date(scheduledFor)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for scheduledFor' },
        { status: 400 }
      )
    }

    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      )
    }

    const { data: draft, error: fetchError } = await supabase
      .from('drafts')
      .select('id, publish_status, content, channel')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    if (draft.publish_status === 'published') {
      return NextResponse.json(
        { error: 'Cannot schedule a draft that has already been published' },
        { status: 400 }
      )
    }

    if (!draft.content || draft.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Cannot schedule an empty draft' },
        { status: 400 }
      )
    }

    // Validate imageRefs: each must be a well-formed uploadId owned by this user.
    // Empty array is allowed (post text-only).
    const refs: string[] = Array.isArray(imageRefs) ? imageRefs : []
    for (const ref of refs) {
      if (typeof ref !== 'string' || !isUploadId(ref) || !owns(ref, user.id)) {
        return NextResponse.json(
          { error: `Invalid imageRef: ${ref}` },
          { status: 400 }
        )
      }
    }

    const { data: updatedDraft, error: updateError } = await supabase
      .from('drafts')
      .update({
        scheduled_for: scheduledDate.toISOString(),
        publish_status: 'scheduled'
      })
      .eq('id', draftId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error scheduling draft:', updateError)
      return NextResponse.json(
        { error: 'Failed to schedule draft' },
        { status: 500 }
      )
    }

    // Map channel từ drafts sang extension_tasks
    const channelMap: Record<string, string> = {
      'facebook': 'facebook',
      'x': 'x',
      'twitter': 'x', // fallback
      'threads': 'threads',
      'instagram': 'instagram',
      'facebook-group': 'facebook-group'
    }
    const extChannel = channelMap[draft.channel] || draft.channel

    // Tạo extension_task để Extension đọc
    const { error: extTaskError } = await supabase
      .from('extension_tasks')
      .insert({
        user_id: user.id,
        draft_id: draftId,
        channel: extChannel,
        content: draft.content,
        images: refs,
        target_id: null,
        target_type: 'auto',
        scheduled_for: scheduledDate.toISOString(),
        status: 'pending',
        priority: 0
      })

    if (extTaskError) {
      console.error('Error creating extension_task:', extTaskError)
      // Vẫn tiếp tục vì draft đã được schedule thành công
    }

    return NextResponse.json({
      success: true,
      draft: updatedDraft,
      message: `Draft scheduled for ${scheduledDate.toLocaleString('vi-VN')}`
    })
  } catch (error) {
    console.error('Error in schedule POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { draftId } = await params

    const { data: draft, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single()

    if (error || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('Error in schedule GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
