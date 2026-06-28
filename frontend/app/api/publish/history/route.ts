import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get publish history for the current user
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('publish_attempts')
      .select(`
        id,
        provider,
        target_name,
        status,
        external_post_id,
        external_post_url,
        error_message,
        created_at,
        updated_at,
        drafts (
          id,
          channel,
          content
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (provider && ['x', 'facebook'].includes(provider)) {
      query = query.eq('provider', provider)
    }

    const { data: attempts, error } = await query

    if (error) {
      console.error('Error fetching publish history:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    // Get total count
    let countQuery = supabase
      .from('publish_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (provider && ['x', 'facebook'].includes(provider)) {
      countQuery = countQuery.eq('provider', provider)
    }

    const { count } = await countQuery

    return NextResponse.json({
      attempts: attempts || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Publish history error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
