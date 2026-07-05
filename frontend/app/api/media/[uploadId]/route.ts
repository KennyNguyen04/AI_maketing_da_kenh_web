import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMedia, owns } from '@/lib/media-store'
import { verifyToken } from '../../extension/_auth'

export const runtime = 'nodejs'

/**
 * GET /api/media/[uploadId]
 *
 * Streams a previously uploaded file back to the caller. Authenticated via
 * either Supabase session cookie (webapp) or Bearer API token (Extension).
 * Returns 410 Gone if the entry has expired or 403 if the uploadId belongs
 * to a different user.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  try {
    const { uploadId } = await params

    // Try Bearer auth first (Extension path). Fall back to cookie auth
    // (webapp preview path).
    let userId = await verifyToken(request.headers.get('Authorization'))
    if (!userId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!owns(uploadId, userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const entry = getMedia(uploadId)
    if (!entry) {
      return NextResponse.json({ error: 'Media expired or not found' }, { status: 410 })
    }

    // Buffer is a Uint8Array; copy into a fresh ArrayBuffer so the Response
    // body is detached from the store buffer (which may be mutated by GC).
    const slice = entry.buffer.slice().buffer
    return new Response(slice, {
      status: 200,
      headers: {
        'Content-Type': entry.mime,
        'Content-Length': String(entry.sizeBytes),
        // Short cache — file is already in memory so serving it twice costs nothing.
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error('GET /api/media/[uploadId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}