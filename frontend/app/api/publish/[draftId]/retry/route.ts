import { NextResponse } from 'next/server'

/**
 * Direct publish retry is disabled by design — Amplify never publishes via
 * X/Facebook APIs. Re-schedule the draft via /api/schedule/[draftId] so the
 * Extension can post it via browser automation.
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error:
        'Direct publish retry is disabled. Re-schedule the draft so the Extension can post it.',
      code: 'DIRECT_PUBLISH_DISABLED',
    },
    { status: 410 },
  )
}