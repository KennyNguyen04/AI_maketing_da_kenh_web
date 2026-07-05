import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import {
  MAX_FILE_BYTES,
  MediaStoreError,
  uploadMedia,
} from '@/lib/media-store'

export const runtime = 'nodejs'

/**
 * POST /api/media/upload
 *
 * Accepts multipart/form-data with a single `file` field. Authenticated via
 * Supabase session cookie (webapp call). Stores the buffer in-memory only,
 * keyed by SHA-256 hash so re-uploading the same file returns the same
 * uploadId without doubling memory use.
 *
 * Returns: { uploadId, expiresAt, deduped }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing or invalid "file" field' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_FILE_BYTES} bytes`, code: 'FILE_TOO_LARGE' },
        { status: 400 },
      )
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image/* mime types are allowed', code: 'UNSUPPORTED_MIME' },
        { status: 400 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // SHA-256 hash of the file bytes. Used both as dedup key and as content
    // integrity check between client and server.
    const hash = createHash('sha256').update(buffer).digest('hex')

    try {
      const result = uploadMedia({
        userId: user.id,
        buffer,
        mime: file.type,
        hash,
      })
      return NextResponse.json(result)
    } catch (err) {
      if (err instanceof MediaStoreError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 413 })
      }
      throw err
    }
  } catch (error) {
    console.error('POST /api/media/upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}