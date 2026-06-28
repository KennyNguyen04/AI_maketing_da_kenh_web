import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: adminError } = await requireAdmin()
  if (adminError) return adminError

  const supabase = await createClient()
  const { id } = await params

  const [{ data: profile }, { data: jobs }, { data: vaults }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('repurpose_jobs').select('id, status, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('brand_vaults').select('id, name, is_active, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
  ])

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    profile,
    jobs: jobs || [],
    vaults: vaults || [],
  })
}
