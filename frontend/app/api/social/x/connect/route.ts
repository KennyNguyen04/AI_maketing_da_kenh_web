import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addQueryParams, createCodeChallenge, createCodeVerifier, createOAuthState } from '@/lib/social/oauth'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.X_CLIENT_ID
  const redirectUri = process.env.X_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'X OAuth is not configured' }, { status: 503 })
  }

  const state = createOAuthState()
  const verifier = createCodeVerifier()
  const cookieStore = await cookies()

  cookieStore.set('amplify_x_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 })
  cookieStore.set('amplify_x_code_verifier', verifier, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 })

  const authUrl = addQueryParams('https://x.com/i/oauth2/authorize', {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: createCodeChallenge(verifier),
    code_challenge_method: 'S256',
  })

  return NextResponse.json({ authUrl })
}
