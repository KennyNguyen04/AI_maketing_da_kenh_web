import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptToken } from '@/lib/social/crypto'
import { isOAuthStateValid, timingSafeEqualString } from '@/lib/social/oauth'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('amplify_x_oauth_state')?.value
  const verifier = cookieStore.get('amplify_x_code_verifier')?.value

  if (!code || !state || !expectedState || !verifier) {
    return NextResponse.redirect(new URL('/settings?social=x&status=failed', request.url))
  }

  // Single combined check: timing-safe equality + expiration
  if (!timingSafeEqualString(state, expectedState) || !isOAuthStateValid(state)) {
    return NextResponse.redirect(new URL('/settings?social=x&status=expired', request.url))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  const redirectUri = process.env.X_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL('/settings?social=x&status=missing_config', request.url))
  }

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })

  const headers: HeadersInit = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
  }

  const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body,
  })

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL('/settings?social=x&status=token_failed', request.url))
  }

  const tokenData = await tokenResponse.json() as {
    access_token: string
    refresh_token?: string
    scope?: string
    expires_in?: number
  }

  const meResponse = await fetch('https://api.x.com/2/users/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  if (!meResponse.ok) {
    return NextResponse.redirect(new URL('/settings?social=x&status=user_failed', request.url))
  }

  const me = await meResponse.json() as { data: { id: string; username?: string; name?: string } }
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null

  await supabase
    .from('social_targets')
    .upsert({
      user_id: user.id,
      provider: 'x',
      external_account_id: me.data.id,
      display_name: me.data.username ? `@${me.data.username}` : me.data.name || 'X Account',
      account_type: 'profile',
      access_token_encrypted: encryptToken(tokenData.access_token),
      refresh_token_encrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null,
      scopes: tokenData.scope?.split(' ') || [],
      token_expires_at: expiresAt,
    }, { onConflict: 'user_id,provider,external_account_id' })

  cookieStore.delete('amplify_x_oauth_state')
  cookieStore.delete('amplify_x_code_verifier')

  return NextResponse.redirect(new URL('/settings?social=x&status=connected', request.url))
}
