import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
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

    const { data: draft, error: fetchError } = await supabase
      .from('drafts')
      .select('id, publish_status')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      )
    }

    if (draft.publish_status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Only scheduled drafts can be cancelled' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('drafts')
      .update({
        scheduled_for: null,
        publish_status: 'draft'
      })
      .eq('id', draftId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error cancelling scheduled draft:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel scheduled post' },
        { status: 500 }
      )
    }

    // === Xóa extension_task tương ứng ===
    await supabase
      .from('extension_tasks')
      .delete()
      .eq('draft_id', draftId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])

    return NextResponse.json({
      success: true,
      message: 'Scheduled post cancelled successfully'
    })
  } catch (error) {
    console.error('Error in cancel schedule DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
