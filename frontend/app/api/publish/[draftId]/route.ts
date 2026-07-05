// NOTE: getValidAccessToken + rateLimiter imports removed — direct API
// publishing is disabled. The commented-out block below references them
// if you ever re-enable.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assertUuid, validationErrorResponse } from '@/lib/validation/api'
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

    // Direct API publishing from the webapp is disabled by design.
    // Amplify never posts on the user's behalf via X/Facebook APIs.
    // Only the Copy+Open handoff flow (mode='fallback') is supported here.
    // The extension may still post via browser automation, scheduled from
    // /api/schedule/[draftId] which writes to extension_tasks.
    if (body.mode !== 'fallback') {
      return NextResponse.json(
        {
          error:
            'Direct publishing is disabled. Use Copy+Open to paste manually, or schedule via the Extension.',
          code: 'DIRECT_PUBLISH_DISABLED',
        },
        { status: 410 },
      )
    }

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

    // [DISABLED] Direct publish to X/FB removed — Amplify never posts via APIs.
    // Code preserved below for potential re-enable. Returns 410 at line ~28.
    /* const { data: account, error: accountError } = await supabase
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

    const { accessToken } = await getValidAccessToken(selectedAccount)

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

    rateLimiter.recordPost(user.id, provider)

    return NextResponse.json({ status: 'published', externalPostId: facebookResult.id, externalPostUrl: externalUrl })
    */
    return NextResponse.json(
      { error: 'Direct publishing is disabled.' },
      { status: 410 },
    )
  } catch (error) {
    const validationResponse = validationErrorResponse(error)
    if (validationResponse) return validationResponse
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Publish failed' }, { status: 500 })
  }
}
