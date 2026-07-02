import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContentWithRetry, MODEL_NAME } from '@/lib/ai/client'

/**
 * POST /api/test/ai
 *
 * Minimal endpoint to verify Google Gemini integration end-to-end on production.
 * Uses gemini-2.5-flash-lite + a tiny prompt to consume ~60 tokens total.
 *
 * IMPORTANT:
 *  - Auth-protected (Supabase) — refuses if not logged in.
 *  - Max prompt length capped at 200 chars to prevent abuse / accidental spend.
 *  - NO retries (retries: 0) to fail fast and surface real errors.
 *  - Runtime: Node (Google GenAI SDK is not edge-compatible).
 *
 * DELETE THIS FILE before production launch (Phase 8 cleanup).
 */

const MAX_PROMPT_LEN = 200

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // Auth gate
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse + validate body
  let body: { prompt?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const prompt = body.prompt?.trim()
  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }
  if (prompt.length > MAX_PROMPT_LEN) {
    return NextResponse.json(
      { error: `Prompt too long (max ${MAX_PROMPT_LEN} chars)` },
      { status: 400 },
    )
  }

  // Call Gemini
  const startedAt = Date.now()
  try {
    const response = await generateContentWithRetry(MODEL_NAME, prompt, 0)
    const elapsedMs = Date.now() - startedAt

    return NextResponse.json({
      ok: true,
      model: MODEL_NAME,
      text: response.text,
      usage: response.usageMetadata,
      elapsedMs,
    })
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : String(error)
    // eslint-disable-next-line no-console
    console.error('POST /api/test/ai failed:', message)

    return NextResponse.json(
      {
        ok: false,
        error: message,
        elapsedMs,
      },
      { status: 500 },
    )
  }
}