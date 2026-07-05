/**
 * In-memory media store for temporary file uploads.
 *
 * Files are kept in process memory only — never written to disk, never uploaded
 * to Supabase Storage. Entries auto-expire after TTL_MS so the store stays
 * bounded even if cleanup callers forget.
 *
 * Dedup is keyed on SHA-256 hash: uploading the same file twice returns the
 * same uploadId without consuming a second slot.
 *
 * Ownership: uploadId encodes the userId (`upl_<userIdShort>_<random>`), and
 * `owns(uploadId, userId)` lets callers enforce per-user access without
 * storing a separate owner field.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_USER_BYTES = 50 * 1024 * 1024
export const TTL_MS = 10 * 60 * 1000

export interface MediaEntry {
  uploadId: string
  hash: string
  mime: string
  buffer: Uint8Array
  sizeBytes: number
  expiresAt: number
}

const store = new Map<string, MediaEntry>()

// userId → total bytes currently held for that user. Used to enforce MAX_USER_BYTES.
const userBytes = new Map<string, number>()

let evictTimer: ReturnType<typeof setInterval> | null = null

function ensureTimer(): void {
  if (evictTimer) return
  evictTimer = setInterval(evictExpired, 60_000)
  // Don't keep the Node event loop alive just for eviction.
  if (typeof (evictTimer as { unref?: () => void }).unref === 'function') {
    (evictTimer as { unref: () => void }).unref()
  }
}

function evictExpired(): void {
  const now = Date.now()
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(id)
      // userBytes is a coarse counter; re-derive from remaining entries instead.
    }
  }
  rebuildUserBytes()
}

function rebuildUserBytes(): void {
  userBytes.clear()
  for (const entry of store.values()) {
    const owner = ownerOf(entry.uploadId)
    userBytes.set(owner, (userBytes.get(owner) ?? 0) + entry.sizeBytes)
  }
}

/**
 * Decodes the userId embedded in the uploadId. uploadId format is
 * `upl_<userIdShort>_<random>` where userIdShort is the first 12 chars of
 * the userId (sufficiently unique in practice).
 */
export function ownerOf(uploadId: string): string {
  const parts = uploadId.split('_')
  // parts: ['upl', '<short>', '<random...>']
  if (parts.length < 3 || parts[0] !== 'upl') return ''
  return parts[1]
}

export function isUploadId(value: string): boolean {
  return /^upl_[A-Za-z0-9_-]{4,32}_[A-Za-z0-9_-]{8,}$/.test(value)
}

/**
 * Persist a buffer in memory. If a live entry with the same hash already
 * exists, return it (deduped). Otherwise insert a new entry.
 *
 * The caller has already verified MAX_FILE_BYTES.
 */
export function uploadMedia(opts: {
  userId: string
  buffer: Uint8Array
  mime: string
  hash: string
}): { uploadId: string; expiresAt: number; deduped: boolean } {
  ensureTimer()

  if (opts.buffer.byteLength > MAX_FILE_BYTES) {
    throw new MediaStoreError('FILE_TOO_LARGE', `File exceeds ${MAX_FILE_BYTES} bytes`)
  }

  // Dedup: scan by hash. Map iteration is O(n) but n is bounded by active users.
  for (const entry of store.values()) {
    if (entry.hash === opts.hash && entry.expiresAt > Date.now()) {
      // Re-set expiry so the file lives another TTL window from the latest touch.
      entry.expiresAt = Date.now() + TTL_MS
      return { uploadId: entry.uploadId, expiresAt: entry.expiresAt, deduped: true }
    }
  }

  // Per-user quota check.
  const currentUserBytes = userBytes.get(opts.userId) ?? 0
  if (currentUserBytes + opts.buffer.byteLength > MAX_USER_BYTES) {
    throw new MediaStoreError('QUOTA_EXCEEDED', `User media quota (${MAX_USER_BYTES} bytes) exceeded`)
  }

  const userIdShort = opts.userId.replace(/-/g, '').slice(0, 12)
  const random = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  const uploadId = `upl_${userIdShort}_${random}`
  const expiresAt = Date.now() + TTL_MS

  store.set(uploadId, {
    uploadId,
    hash: opts.hash,
    mime: opts.mime,
    buffer: opts.buffer,
    sizeBytes: opts.buffer.byteLength,
    expiresAt,
  })
  userBytes.set(opts.userId, currentUserBytes + opts.buffer.byteLength)

  return { uploadId, expiresAt, deduped: false }
}

export function getMedia(uploadId: string): MediaEntry | null {
  const entry = store.get(uploadId)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    store.delete(uploadId)
    return null
  }
  return entry
}

export function owns(uploadId: string, userId: string): boolean {
  if (!isUploadId(uploadId)) return false
  const userIdShort = userId.replace(/-/g, '').slice(0, 12)
  return uploadId.startsWith(`upl_${userIdShort}_`)
}

export interface MediaStats {
  count: number
  totalBytes: number
  perUser: Record<string, number>
}

export function getStats(): MediaStats {
  evictExpired()
  const perUser: Record<string, number> = {}
  let total = 0
  for (const entry of store.values()) {
    total += entry.sizeBytes
    const owner = ownerOf(entry.uploadId)
    perUser[owner] = (perUser[owner] ?? 0) + entry.sizeBytes
  }
  return { count: store.size, totalBytes: total, perUser }
}

export class MediaStoreError extends Error {
  code: 'FILE_TOO_LARGE' | 'QUOTA_EXCEEDED'
  constructor(code: 'FILE_TOO_LARGE' | 'QUOTA_EXCEEDED', message: string) {
    super(message)
    this.code = code
  }
}