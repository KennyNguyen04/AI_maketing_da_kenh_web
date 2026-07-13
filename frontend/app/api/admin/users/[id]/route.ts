import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { assertUuid, validationErrorResponse } from '@/lib/validation/api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: adminError } = await requireAdmin()
    if (adminError) return adminError

    // Validate UUID up front — without this, garbage input reaches Supabase
    // and returns a 500 instead of a clean 400.
    const { id: rawId } = await params
    const id = assertUuid(rawId, 'user_id')

    // Use supabaseAdmin (service role, bypasses RLS) so admin can read
    // any user's profile / jobs / vaults. createClient() applies
    // RLS USING (auth.uid() = id), which filters out every other user's row.
    const supabase = supabaseAdmin

    const [{ data: profile }, { data: jobs }, { data: vaults }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('repurpose_jobs')
        .select('id, status, title, source_type, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('brand_vaults')
        .select('id, name, is_active, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      profile,
      jobs: jobs || [],
      vaults: vaults || [],
    })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    return NextResponse.json({ error: 'Failed to load user details' }, { status: 500 })
  }
}