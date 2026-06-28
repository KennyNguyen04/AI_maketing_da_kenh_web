import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimiter } from '@/lib/social/rate-limiter'
import { getValidAccessToken } from '@/lib/social/token-manager'
import { assertUuid, validationErrorResponse } from '@/lib/validation/api'
import type { SocialProvider } from '@/lib/types'

/**
 * Retry a failed publish attempt
 * Clears the error and re-attempts publishing
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { draftId: rawDraftId } = await params
    const draftId = assertUuid(rawDraftId, 'draft_id')
    const body = await request.json()
    const provider = body.provider as SocialProvider

    if (!['x', 'facebook'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Find failed attempt for this draft and provider
    const { data: failedAttempt, error: findError } = await supabase
      .from('publish_attempts')
      .select('*')
      .eq('draft_id', draftId)
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findError || !failedAttempt) {
      return NextResponse.json({ error: 'No failed attempt found to retry' }, { status: 404 })
    }

    // Get the draft
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('id, content')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single()

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Get the account
    const { data: account } = await supabase
      .from('social_targets')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('external_account_id', failedAttempt.target_id)
      .maybeSingle()

    if (!account) {
      return NextResponse.json({ error: `${provider} account not found` }, { status: 404 })
    }

    // Check rate limit
    const rateCheck = rateLimiter.canPost(user.id, provider)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: rateCheck.reason || 'Rate limit exceeded',
          retryAfter: rateCheck.retryAfter,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      )
    }

    // Get valid access token
    const { accessToken } = await getValidAccessToken(account)

    // Atomic reset: only update if status is still 'failed' (prevents reset of already-published)
    const { data: resetAttempt, error: resetError } = await supabase
      .from('publish_attempts')
      .update({
        status: 'publishing',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', failedAttempt.id)
      .eq('status', 'failed')
      .select('id')
      .single()

    if (resetError || !resetAttempt) {
      return NextResponse.json({ error: 'Could not reset attempt — already in progress or published' }, { status: 409 })
    }

    // Attempt to publish
    if (provider === 'x') {
      const response = await fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: draft.content }),
      })

      const result = await response.json().catch(() => ({})) as { data?: { id?: string }; detail?: string; title?: string }
      if (!response.ok || !result.data?.id) {
        const errorMessage = result.detail || result.title || 'X publish failed'
        await supabase.from('publish_attempts').update({ status: 'failed', error_message: errorMessage }).eq('id', failedAttempt.id)
        return NextResponse.json({ error: errorMessage }, { status: 502 })
      }

      const externalUrl = `https://x.com/i/web/status/${result.data.id}`
      await supabase
        .from('publish_attempts')
        .update({ status: 'published', external_post_id: result.data.id, external_post_url: externalUrl })
        .eq('id', failedAttempt.id)

      rateLimiter.recordPost(user.id, provider)

      return NextResponse.json({ status: 'published', externalPostId: result.data.id, externalPostUrl: externalUrl })
    }

    // Facebook
    const facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${account.external_account_id}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        message: draft.content,
        access_token: accessToken,
      }),
    })

    const facebookResult = await facebookResponse.json().catch(() => ({})) as { id?: string; error?: { message?: string } }
    if (!facebookResponse.ok || !facebookResult.id) {
      const errorMessage = facebookResult.error?.message || 'Facebook Page publish failed'
      await supabase.from('publish_attempts').update({ status: 'failed', error_message: errorMessage }).eq('id', failedAttempt.id)
      return NextResponse.json({ error: errorMessage }, { status: 502 })
    }

    const externalUrl = `https://www.facebook.com/${facebookResult.id}`
    await supabase
      .from('publish_attempts')
      .update({ status: 'published', external_post_id: facebookResult.id, external_post_url: externalUrl })
      .eq('id', failedAttempt.id)

    rateLimiter.recordPost(user.id, provider)

    return NextResponse.json({ status: 'published', externalPostId: facebookResult.id, externalPostUrl: externalUrl })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Retry failed' }, { status: 500 })
  }
}
