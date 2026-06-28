import { createClient } from '@/lib/supabase/server'
import { decryptToken, encryptToken } from './crypto'

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000 // Refresh 5 minutes before expiry

export interface TokenInfo {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
}

export interface RefreshResult {
  success: boolean
  token?: TokenInfo
  error?: string
}

/**
 * Check if a token is expiring soon (within buffer time)
 */
function isTokenExpiringSoon(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const expiryTime = new Date(expiresAt).getTime()
  return Date.now() + TOKEN_EXPIRY_BUFFER_MS >= expiryTime
}

/**
 * Check if a token is already expired
 */
export function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return Date.now() >= new Date(expiresAt).getTime()
}

/**
 * Refresh X OAuth token using the refresh token
 */
async function refreshXToken(
  refreshTokenEncrypted: string,
  clientId: string,
  clientSecret?: string
): Promise<TokenInfo> {
  const refreshToken = decryptToken(refreshTokenEncrypted)

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_id: clientId,
  })

  const headers: HeadersInit = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
  }

  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`X token refresh failed: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // X may return new refresh token
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
  }
}

/**
 * Refresh Facebook Page access token
 */
async function refreshFacebookToken(
  accessTokenEncrypted: string,
  appId: string,
  appSecret: string
): Promise<TokenInfo> {
  const accessToken = decryptToken(accessTokenEncrypted)

  // Facebook Long-lived tokens (60 days) - exchange short-lived for long-lived
  const exchangeUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token')
  exchangeUrl.searchParams.set('grant_type', 'fb_exchange_token')
  exchangeUrl.searchParams.set('client_id', appId)
  exchangeUrl.searchParams.set('client_secret', appSecret)
  exchangeUrl.searchParams.set('fb_exchange_token', accessToken)

  const response = await fetch(exchangeUrl.toString())

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Facebook token exchange failed: ${response.status} - ${error}`)
  }

  const data = await response.json() as {
    access_token: string
    token_type?: string
    expires_in?: number // seconds until expiry (max 5184000 = 60 days)
  }

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
  }
}

/**
 * Save refreshed tokens to database
 */
async function saveNewTokens(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  token: TokenInfo
): Promise<void> {
  await supabase
    .from('social_targets')
    .update({
      access_token_encrypted: encryptToken(token.accessToken),
      refresh_token_encrypted: token.refreshToken
        ? encryptToken(token.refreshToken)
        : undefined,
      token_expires_at: token.expiresAt,
      scopes: undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
}

/**
 * Get a valid access token, refreshing if necessary
 * Returns the account with fresh tokens if refresh was performed
 */
export async function getValidAccessToken(
  account: {
    id: string
    provider: 'x' | 'facebook'
    access_token_encrypted: string
    refresh_token_encrypted?: string | null
    token_expires_at?: string | null
  }
): Promise<{ account: typeof account; accessToken: string }> {
  // Check if token needs refresh
  if (!isTokenExpiringSoon(account.token_expires_at)) {
    return {
      account,
      accessToken: decryptToken(account.access_token_encrypted),
    }
  }

  const supabase = await createClient()
  let newToken: TokenInfo

  try {
    if (account.provider === 'x') {
      const clientId = process.env.X_CLIENT_ID
      const clientSecret = process.env.X_CLIENT_SECRET

      if (!clientId || !account.refresh_token_encrypted) {
        throw new Error('Missing X OAuth credentials or refresh token')
      }

      newToken = await refreshXToken(account.refresh_token_encrypted, clientId, clientSecret)
    } else {
      const appId = process.env.FACEBOOK_APP_ID
      const appSecret = process.env.FACEBOOK_APP_SECRET

      if (!appId || !appSecret) {
        throw new Error('Missing Facebook OAuth credentials')
      }

      newToken = await refreshFacebookToken(
        account.access_token_encrypted,
        appId,
        appSecret
      )
    }

    // Save new tokens
    await saveNewTokens(supabase, account.id, newToken)

    // Return account with new access token
    return {
      account: {
        ...account,
        access_token_encrypted: encryptToken(newToken.accessToken),
        refresh_token_encrypted: newToken.refreshToken
          ? encryptToken(newToken.refreshToken)
          : account.refresh_token_encrypted,
        token_expires_at: newToken.expiresAt,
      },
      accessToken: newToken.accessToken,
    }
  } catch (error) {
    // If refresh fails, try to use the current token anyway
    // It might still work if we checked too early
    console.error(`Token refresh failed for ${account.provider}:`, error)
    return {
      account,
      accessToken: decryptToken(account.access_token_encrypted),
    }
  }
}

/**
 * Validate that an account has valid tokens for publishing
 */
export function validateAccountForPublishing(account: {
  provider: 'x' | 'facebook'
  access_token_encrypted: string
  refresh_token_encrypted?: string | null
}): { valid: boolean; error?: string } {
  if (!account.access_token_encrypted) {
    return { valid: false, error: 'No access token found' }
  }

  if (account.provider === 'x' && !account.refresh_token_encrypted) {
    // X tokens expire, refresh token is needed for long-term access
    return {
      valid: false,
      error: 'X account needs reconnection - refresh token not available',
    }
  }

  return { valid: true }
}
