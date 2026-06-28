import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = await createClient()

    const [
      usersResult,
      jobsResult,
      attemptsResult,
      recentActivityResult,
      vaultsResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, user_plan, created_at', { count: 'exact', head: false }),
      supabase
        .from('repurpose_jobs')
        .select('status, created_at', { count: 'exact', head: false }),
      supabase
        .from('publish_attempts')
        .select('status, provider, created_at', { count: 'exact', head: false }),
      supabase
        .from('publish_attempts')
        .select('status, provider, created_at, user_id, profiles(email)')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('brand_vaults')
        .select('id, user_id, created_at', { count: 'exact', head: false }),
    ])

    const users = usersResult.data || []
    const jobs = jobsResult.data || []
    const attempts = attemptsResult.data || []
    const recentActivity = recentActivityResult.data || []
    const vaults = vaultsResult.data || []

    const totalUsers = users.length
    const totalJobs = jobs.length
    const successfulJobs = jobs.filter((job) => job.status === 'done').length
    const failedJobs = jobs.filter((job) => job.status === 'failed').length
    const successRate = totalJobs > 0 ? Math.round((successfulJobs / totalJobs) * 100) : 0
    const totalPosts = attempts.length
    const publishedPosts = attempts.filter((item) => item.status === 'published').length
    const failedPosts = attempts.filter((item) => item.status === 'failed').length
    const xPosts = attempts.filter((item) => item.provider === 'x').length
    const facebookPosts = attempts.filter((item) => item.provider === 'facebook').length
    const totalVaults = vaults.length

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.toISOString()

    const todayStats = {
      jobs: jobs.filter((job) => new Date(job.created_at) >= today).length,
      posts: attempts.filter((item) => new Date(item.created_at) >= today).length,
      users: users.filter((user) => new Date(user.created_at) >= today).length,
    }

  return NextResponse.json({
    users: { total: totalUsers, byPlan: {} },
    jobs: { total: totalJobs, successRate, completed: successfulJobs, failed: failedJobs },
    posts: {
      total: totalPosts,
      published: publishedPosts,
      failed: failedPosts,
      byProvider: {
        x: xPosts,
        facebook: facebookPosts,
      },
    },
    vaults: { total: totalVaults },
    today: todayStats,
    recentActivity: recentActivity.map((item) => ({
      id: item.user_id,
      type: 'publish',
      status: item.status,
      provider: item.provider,
      createdAt: item.created_at,
      user: item.profiles?.[0]?.email || null,
    })),
  })
}
