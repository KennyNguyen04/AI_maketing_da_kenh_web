import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyToken } from '../_auth'

export async function POST(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const supabase = await createClient()
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { extension_registered: true, extension_registered_at: new Date().toISOString() }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('POST /api/extension/register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const supabase = await createClient()
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { extension_registered: false }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/extension/register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
