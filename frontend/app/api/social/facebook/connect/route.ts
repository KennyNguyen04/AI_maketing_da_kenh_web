import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addQueryParams, createOAuthState } from '@/lib/social/oauth'

// NOTE: Facebook OAuth 2.0 does NOT support PKCE (no `code_challenge` /
// `code_verifier` parameters recognised by the authorisation or token
// endpoints). The equivalent for confidential server-side apps is
// `appsecret_proof` — an HMAC-SHA256 of the access token using the app secret,
// required by Facebook for every Graph API call. We enforce that in the
// callback handler.

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appId = process.env.FACEBOOK_APP_ID
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI

  if (!appId || !redirectUri) {
    return NextResponse.json({ error: 'Facebook OAuth is not configured' }, { status: 503 })
  }

  const state = createOAuthState()
  const cookieStore = await cookies()

  cookieStore.set('amplify_facebook_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 })

  const authUrl = addQueryParams('https://www.facebook.com/v20.0/dialog/oauth', {
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: 'code',
    scope: 'pages_show_list,pages_read_engagement,pages_manage_posts',
  })

  return NextResponse.json({ authUrl })
}