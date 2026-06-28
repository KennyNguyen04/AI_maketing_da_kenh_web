import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status') || 'scheduled'
    const offset = (page - 1) * limit

    let query = supabase
      .from('drafts')
      .select(`
        id,
        job_id,
        channel,
        content,
        scheduled_for,
        publish_status,
        is_edited,
        version,
        created_at,
        updated_at,
        repurpose_jobs (
          id,
          title,
          source_content
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)

    if (status === 'scheduled') {
      query = query
        .eq('publish_status', 'scheduled')
        .gte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
    } else if (status === 'past') {
      query = query
        .eq('publish_status', 'scheduled')
        .lt('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: false })
    } else if (status === 'all') {
      query = query
        .in('publish_status', ['scheduled', 'published'])
        .not('scheduled_for', 'is', null)
        .order('scheduled_for', { ascending: false })
    }

    const { data: drafts, error, count } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching scheduled drafts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled drafts' },
        { status: 500 }
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      drafts: drafts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })
  } catch (error) {
    console.error('Error in schedule list GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
