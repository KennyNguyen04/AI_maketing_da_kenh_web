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
    const period = searchParams.get('period') || '30' // days
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - parseInt(period, 10))
    const startDate = daysAgo.toISOString()

    // Fetch publish attempts with job info
    const { data: attempts, error, count } = await supabase
      .from('publish_attempts')
      .select(`
        id,
        provider,
        target_id,
        target_name,
        status,
        external_post_id,
        external_post_url,
        error_message,
        created_at,
        updated_at,
        drafts (
          id,
          content,
          channel,
          job_id,
          repurpose_jobs (
            id,
            title,
            source_content
          )
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching analytics:', error)
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      )
    }

    // Calculate aggregated stats
    const { data: allAttemptsInPeriod } = await supabase
      .from('publish_attempts')
      .select('status, provider, created_at')
      .eq('user_id', user.id)
      .gte('created_at', startDate)

    const stats = {
      totalPosts: allAttemptsInPeriod?.length || 0,
      successfulPosts: allAttemptsInPeriod?.filter((a) => a.status === 'published').length || 0,
      failedPosts: allAttemptsInPeriod?.filter((a) => a.status === 'failed').length || 0,
      successRate: 0,
      byProvider: {
        x: {
          total: allAttemptsInPeriod?.filter((a) => a.provider === 'x').length || 0,
          successful: allAttemptsInPeriod?.filter((a) => a.provider === 'x' && a.status === 'published').length || 0,
          failed: allAttemptsInPeriod?.filter((a) => a.provider === 'x' && a.status === 'failed').length || 0,
        },
        facebook: {
          total: allAttemptsInPeriod?.filter((a) => a.provider === 'facebook').length || 0,
          successful: allAttemptsInPeriod?.filter((a) => a.provider === 'facebook' && a.status === 'published').length || 0,
          failed: allAttemptsInPeriod?.filter((a) => a.provider === 'facebook' && a.status === 'failed').length || 0,
        },
      },
      byDay: {} as Record<string, { total: number; successful: number; failed: number }>,
    }

    // Calculate success rate
    stats.successRate = stats.totalPosts > 0
      ? Math.round((stats.successfulPosts / stats.totalPosts) * 100)
      : 0

    // Calculate by-day stats
    allAttemptsInPeriod?.forEach((attempt) => {
      const dayKey = attempt.created_at.split('T')[0]
      if (!stats.byDay[dayKey]) {
        stats.byDay[dayKey] = { total: 0, successful: 0, failed: 0 }
      }
      stats.byDay[dayKey].total++
      if (attempt.status === 'published') {
        stats.byDay[dayKey].successful++
      } else if (attempt.status === 'failed') {
        stats.byDay[dayKey].failed++
      }
    })

    // Get content stats from drafts
    const { data: contentStats } = await supabase
      .from('drafts')
      .select('channel, publish_status')
      .eq('user_id', user.id)

    const channelStats = {
      linkedin_post: { total: 0, scheduled: 0, published: 0 },
      linkedin_thread: { total: 0, scheduled: 0, published: 0 },
      facebook: { total: 0, scheduled: 0, published: 0 },
      twitter: { total: 0, scheduled: 0, published: 0 },
    }

    contentStats?.forEach((draft) => {
      const channel = draft.channel as keyof typeof channelStats
      if (channelStats[channel]) {
        channelStats[channel].total++
        if (draft.publish_status === 'scheduled') channelStats[channel].scheduled++
        if (draft.publish_status === 'published') channelStats[channel].published++
      }
    })

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      stats,
      channelStats,
      posts: attempts || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
      period: parseInt(period, 10),
    })
  } catch (error) {
    console.error('Error in analytics GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
