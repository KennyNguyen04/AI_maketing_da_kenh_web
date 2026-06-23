import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeVoiceFromForm } from '@/lib/ai'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topics, tone, audience, style, samples } = await request.json()

    // Basic validation
    if (!topics || !tone || !audience || !style) {
      return NextResponse.json({ error: 'Missing required form fields' }, { status: 400 })
    }

    // Call Gemini directly to analyze the answers and generate a voice profile JSON
    const voiceProfile = await analyzeVoiceFromForm({
      topics,
      tone,
      audience,
      style,
      samples,
    })

    // Construct raw_input string for historical reference
    const rawInput = `Chủ đề: ${topics}\nGiọng văn: ${tone}\nĐộc giả: ${audience}\nVăn phong: ${style}\nMẫu câu: ${samples || 'Không có'}`

    // Insert active brand vault record directly
    const { data: vault, error: insertError } = await supabase
      .from('brand_vaults')
      .insert({
        user_id: user.id,
        name: 'My Brand Voice',
        source_type: 'form',
        raw_input: rawInput,
        voice_profile: voiceProfile,
        system_prompt: voiceProfile.system_prompt_cache,
        is_active: true, // Directly active because we analyzed it synchronously
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Supabase insert error in from-form:', insertError)
      return NextResponse.json({ error: 'Failed to create brand vault record' }, { status: 500 })
    }

    return NextResponse.json({ vaultId: vault.id, status: 'success' })
  } catch (error) {
    console.error('API from-form error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
