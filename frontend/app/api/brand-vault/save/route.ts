import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { vaultId, voice_profile, name } = await request.json()

    if (!vaultId || !voice_profile) {
      return NextResponse.json({ error: 'Missing vaultId or voice profile' }, { status: 400 })
    }

    // When the user edits the voice profile and saves it, we need to update the system_prompt too
    const systemPrompt = voice_profile.system_prompt_cache

    const { error: updateError } = await supabase
      .from('brand_vaults')
      .update({
        name: name || 'My Brand Voice',
        voice_profile,
        system_prompt: systemPrompt,
        is_active: true,
      })
      .eq('id', vaultId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Supabase update error:', updateError)
      return NextResponse.json({ error: 'Failed to update brand vault' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
