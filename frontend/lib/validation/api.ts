import type { Channel, SourceType } from '@/lib/types'

export const VALID_CHANNELS: Channel[] = ['linkedin_post', 'linkedin_thread', 'facebook', 'twitter']
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

export function validateChannels(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiValidationError('Please select at least one channel')
  }

  const channels = [...new Set(value)]
  if (!channels.every((channel) => VALID_CHANNELS.includes(channel as Channel))) {
    throw new ApiValidationError('One or more channels are invalid')
  }

  return channels as Channel[]
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
