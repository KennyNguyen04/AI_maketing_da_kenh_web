import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken } from '@/lib/social/token-manager'
import { rateLimiter } from '@/lib/social/rate-limiter'
import { assertUuid, validationErrorResponse, ApiValidationError } from '@/lib/validation/api'
import type { SocialProvider } from '@/lib/types'

const VALID_PROVIDERS: SocialProvider[] = ['x', 'facebook']

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

    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid publish provider' }, { status: 400 })
    }

    // Validate account_id format if provided
    if (body.account_id !== undefined && body.account_id !== null && body.account_id !== '') {
      try { assertUuid(body.account_id, 'account_id') } catch { return NextResponse.json({ error: 'account_id is invalid' }, { status: 400 }) }
    }

    // Validate mode if provided
    if (body.mode !== undefined && !['direct', 'fallback'].includes(body.mode)) {
      return NextResponse.json({ error: 'mode must be direct or fallback' }, { status: 400 })
    }

    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .select('id, job_id, user_id, channel, content')
      .eq('id', draftId)
      .eq('user_id', user.id)
      .single()

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    if (provider === 'x' && draft.content.length > 280) {
      return NextResponse.json({ error: 'X posts must be 280 characters or less' }, { status: 400 })
    }

    if (body.mode === 'fallback') {
      const isX = provider === 'x'
      const { data: attempt } = await supabase
        .from('publish_attempts')
        .insert({
          draft_id: draft.id,
          user_id: user.id,
          provider,
          target_name: isX ? 'X manual composer' : 'Facebook manual composer',
          status: 'draft',
        })
        .select('id')
        .single()

      return NextResponse.json({
        status: 'draft',
        attemptId: attempt?.id,
        handoffUrl: isX ? 'https://x.com/compose/post' : 'https://www.facebook.com/',
        message: isX
          ? 'Copied content can be pasted into X composer.'
          : 'Copied content can be pasted into Facebook composer.',
      })
    }

    const { data: account, error: accountError } = await supabase
      .from('social_targets')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('id', body.account_id || '')
      .maybeSingle()

    const { data: fallbackAccount } = !body.account_id
      ? await supabase
        .from('social_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      : { data: null }

    const selectedAccount = account || fallbackAccount

    if (accountError || !selectedAccount) {
      return NextResponse.json({ error: `${provider} account is not connected` }, { status: 404 })
    }

    // Get valid access token (refresh if needed)
    const { accessToken } = await getValidAccessToken(selectedAccount)

    // Check rate limit before publishing
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

    // Atomic claim via DB function — eliminates race condition between
    // "check no in-flight publish" and "insert new attempt"
    const { data: attemptId, error: attemptError } = await supabase.rpc(
      'claim_publish_attempt',
      {
        p_draft_id: draft.id,
        p_user_id: user.id,
        p_provider: provider,
        p_target_id: selectedAccount.external_account_id,
        p_target_name: selectedAccount.display_name,
      }
    )

    if (attemptError) {
      return NextResponse.json({ error: 'Could not create publish attempt' }, { status: 500 })
    }

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Another publish attempt is in progress for this draft' },
        { status: 409 }
      )
    }

    const attempt = { id: attemptId }

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
        await supabase.from('publish_attempts').update({ status: 'failed', error_message: errorMessage }).eq('id', attempt.id)
        return NextResponse.json({ error: errorMessage }, { status: 502 })
      }

      const externalUrl = `https://x.com/i/web/status/${result.data.id}`
      await supabase
        .from('publish_attempts')
        .update({ status: 'published', external_post_id: result.data.id, external_post_url: externalUrl })
        .eq('id', attempt.id)

      // Record successful post for rate limiting
      rateLimiter.recordPost(user.id, provider)

      return NextResponse.json({ status: 'published', externalPostId: result.data.id, externalPostUrl: externalUrl })
    }

    const facebookResponse = await fetch(`https://graph.facebook.com/v20.0/${selectedAccount.external_account_id}/feed`, {
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
      await supabase.from('publish_attempts').update({ status: 'failed', error_message: errorMessage }).eq('id', attempt.id)
      return NextResponse.json({ error: errorMessage }, { status: 502 })
    }

    const externalUrl = `https://www.facebook.com/${facebookResult.id}`
    await supabase
      .from('publish_attempts')
      .update({ status: 'published', external_post_id: facebookResult.id, external_post_url: externalUrl })
      .eq('id', attempt.id)

    // Record successful post for rate limiting
    rateLimiter.recordPost(user.id, provider)

    return NextResponse.json({ status: 'published', externalPostId: facebookResult.id, externalPostUrl: externalUrl })
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Publish failed' }, { status: 500 })
  }
}
