import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/social/crypto'
import { isOAuthStateValid, timingSafeEqualString } from '@/lib/social/oauth'

// NOTE: Facebook OAuth 2.0 does not support PKCE. We protect server-side
// Graph API calls with `appsecret_proof` (HMAC-SHA256 of access_token keyed
// by app_secret), which Facebook requires for production apps.

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('amplify_facebook_oauth_state')?.value

  if (!code || !state || !expectedState) {
    return NextResponse.redirect(new URL('/settings?social=facebook&status=failed', request.url))
  }

  // Use timing-safe comparison to prevent timing side-channels, then check expiration.
  if (!isOAuthStateValid(state) || !timingSafeEqualString(state, expectedState)) {
    return NextResponse.redirect(new URL('/settings?social=facebook&status=expired', request.url))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI

  if (!appId || !appSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/settings?social=facebook&status=missing_config', request.url))
  }

  const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenResponse = await fetch(tokenUrl)
  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/settings?social=facebook&status=token_failed', request.url))
  }

  const tokenData = await tokenResponse.json() as { access_token: string; expires_in?: number }

  // appsecret_proof = HMAC-SHA256(app_secret, access_token) — required by Facebook
  // for every Graph API call from a server-side confidential client.
  // Plain SHA-256(concat) is NOT the same as HMAC-SHA256(key, data); use createHmac.
  const appsecretProof = createHmac('sha256', appSecret).update(tokenData.access_token).digest('hex')

  const pagesResponse = await fetch(
    `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,tasks&access_token=${encodeURIComponent(tokenData.access_token)}&appsecret_proof=${appsecretProof}`
  )

  if (!pagesResponse.ok) {
    return NextResponse.redirect(new URL('/settings?social=facebook&status=pages_failed', request.url))
  }

  const pages = await pagesResponse.json() as {
    data?: Array<{ id: string; name: string; access_token?: string; tasks?: string[] }>
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null

  const pageRows = (pages.data || [])
    .filter((page) => page.access_token)
    .map((page) => ({
      user_id: user.id,
      provider: 'facebook',
      external_account_id: page.id,
      display_name: page.name,
      account_type: 'page',
      access_token_encrypted: encryptToken(page.access_token!),
      refresh_token_encrypted: null,
      scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
      token_expires_at: expiresAt,
    }))

  if (pageRows.length > 0) {
    await supabase
      .from('social_targets')
      .upsert(pageRows, { onConflict: 'user_id,provider,external_account_id' })
  }

  await cookieStore.delete('amplify_facebook_oauth_state')

  const status = pageRows.length > 0 ? 'connected' : 'no_pages'
  return NextResponse.redirect(new URL(`/settings?social=facebook&status=${status}`, request.url))
}