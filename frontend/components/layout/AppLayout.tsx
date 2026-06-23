import { createClient } from '@/lib/supabase/server'
import { Sidebar } from './Sidebar'

export async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = fullName.substring(0, 2).toUpperCase()
  const { data: profile } = user
    ? await supabase.from('profiles').select('user_plan').eq('id', user.id).single()
    : { data: null }

  return (
    <div className="min-h-screen bg-app-bg">
      <Sidebar userName={fullName} userInitials={initials} userPlan={profile?.user_plan || 'free'} />
      <main className="min-h-screen px-4 pb-8 pt-[88px] md:ml-[232px] md:px-8 md:py-8 lg:px-10">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  )
}
