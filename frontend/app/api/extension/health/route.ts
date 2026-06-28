import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/extension/health
 * Check if extension has been registered by user
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ 
        connected: false, 
        registered: false,
        reason: 'not_logged_in' 
      })
    }

    // Check if user has registered the extension
    const registered = user.user_metadata?.extension_registered === true
    const registeredAt = user.user_metadata?.extension_registered_at || null

    // Get extension task stats
    const { count: totalTasks } = await supabase
      .from('extension_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { count: completedToday } = await supabase
      .from('extension_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', new Date().toISOString().split('T')[0])

    return NextResponse.json({
      connected: registered,
      registered,
      registered_at: registeredAt,
      total_tasks: totalTasks || 0,
      completed_today: completedToday || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('GET /api/extension/health error:', error)
    return NextResponse.json({ 
      connected: false, 
      registered: false,
      reason: 'error' 
    })
  }
}
