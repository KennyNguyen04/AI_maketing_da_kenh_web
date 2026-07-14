import type { Channel, SourceType } from '@/lib/types'

// Canonical channels: 'linkedin_post'/'linkedin_thread'/'facebook'/'x'/'threads'
// 'threads' added 2026-07-15 (matches migration 023 + lib/types Channel).
// 'twitter' is accepted as an alias for 'x' (deprecated). Validation normalises it.
export const VALID_CHANNELS: Channel[] = ['linkedin_post', 'linkedin_thread', 'facebook', 'x', 'threads']
// Pinned (5 channels) instead of 'facebook-group' / 'instagram' — those
// channels have automators but are not wired into NewJobForm yet.

export const DEPRECATED_CHANNEL_ALIASES: Record<string, Channel> = {
  twitter: 'x',
}
export const VALID_SOURCE_TYPES: SourceType[] = ['url', 'text', 'form']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function assertUuid(value: unknown, field: string) {
  if (!isUuid(value)) {
    throw new ApiValidationError(`${field} is invalid`, 400)
  }
  return value
}

export function assertUuidOrEmpty(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return assertUuid(value, field)
}

export class ApiValidationError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ApiValidationError'
    this.status = status
  }
}

export function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Normalise channel aliases (e.g. 'twitter' -> 'x') so downstream code only ever
 * sees canonical channel names.
 */
export function normaliseChannel(value: unknown): Channel | null {
  if (typeof value !== 'string') return null
  const lower = value.trim().toLowerCase()
  if (VALID_CHANNELS.includes(lower as Channel)) return lower as Channel
  if (DEPRECATED_CHANNEL_ALIASES[lower]) return DEPRECATED_CHANNEL_ALIASES[lower]
  return null
}

export function validateChannels(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiValidationError('Please select at least one channel')
  }

  // Dedupe input first (case-sensitive), then normalise each to canonical form,
  // then dedupe again to catch aliases like 'twitter' + 'x' that collapse to the
  // same canonical channel.
  const uniqueInput = [...new Set(value.map((c) => String(c)))]
  const normalised: Channel[] = []
  for (const raw of uniqueInput) {
    const canonical = normaliseChannel(raw)
    if (!canonical) {
      throw new ApiValidationError(`Channel "${raw}" is invalid`)
    }
    if (normalised.includes(canonical)) {
      throw new ApiValidationError(
        `Duplicate channel "${raw}" (resolves to "${canonical}")`,
      )
    }
    normalised.push(canonical)
  }

  return normalised as Channel[]
}

export function validateSourceType(value: unknown) {
  if (value === undefined || value === null || value === '') return 'text'
  if (!VALID_SOURCE_TYPES.includes(value as SourceType) || value === 'form') {
    throw new ApiValidationError('source_type must be text or url')
  }
  return value as Extract<SourceType, 'text' | 'url'>
}

export function validateTitle(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new ApiValidationError('title must be a string')
  const trimmed = value.trim()
  if (trimmed.length > 160) throw new ApiValidationError('title must be 160 characters or less')
  return trimmed || undefined
}

export function validateSourceContent(value: unknown, sourceType: 'text' | 'url') {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiValidationError('Source content is required')
  }

  const trimmed = value.trim()
  if (sourceType === 'url') {
    try {
      const parsed = new URL(trimmed)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Unsupported protocol')
      }
    } catch {
      throw new ApiValidationError('Please provide a valid public URL')
    }
    return trimmed
  }

  if (wordCount(trimmed) > 5000) {
    throw new ApiValidationError('Source content must be 5000 words or less')
  }

  if (trimmed.length < 50) {
    throw new ApiValidationError('Source content must be at least 50 characters')
  }

  return trimmed
}

export function validateDraftContent(value: unknown) {
  if (typeof value !== 'string') {
    throw new ApiValidationError('content must be a string')
  }
  if (value.length > 70000) {
    throw new ApiValidationError('content is too long')
  }
  return value
}

export function validationErrorResponse(error: unknown) {
  if (error instanceof ApiValidationError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  return null
}
