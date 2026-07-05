'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MAX_FILE_BYTES } from '@/lib/media-store'

interface UploadedItem {
  uploadId: string
  fileName: string
  previewUrl: string
  expiresAt: number
}

export interface MediaUploaderProps {
  uploadIds: string[]
  onChange: (uploadIds: string[]) => void
  onUploadingChange?: (uploading: boolean) => void
  maxFiles?: number
}

const MAX_FILES_DEFAULT = 4
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  const bytes = new Uint8Array(digest)
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex
}

export function MediaUploader({ uploadIds, onChange, onUploadingChange, maxFiles = MAX_FILES_DEFAULT }: MediaUploaderProps) {
  const [items, setItems] = useState<UploadedItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    onUploadingChange?.(isUploading)
  }, [isUploading, onUploadingChange])

  // Hydrate from incoming uploadIds prop. Caller controls the source of truth,
  // so when uploadIds changes we replace local state (e.g. parent reset).
  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      const next: UploadedItem[] = []
      for (const id of uploadIds) {
        const existing = items.find(i => i.uploadId === id)
        if (existing) {
          next.push(existing)
          continue
        }
        // Fetch small metadata via HEAD-like probe — we only need the binary to
        // build a preview. Use GET but track with a token so a stale promise
        // can't overwrite newer state.
        try {
          const res = await fetch(`/api/media/${id}`)
          if (!res.ok) continue
          const blob = await res.blob()
          if (cancelled) continue
          next.push({
            uploadId: id,
            fileName: `image-${id.slice(-6)}`,
            previewUrl: URL.createObjectURL(blob),
            expiresAt: Date.now() + 10 * 60 * 1000,
          })
        } catch {
          // ignore — preview is best-effort
        }
      }
      if (!cancelled) setItems(next)
    }
    if (uploadIds.length === 0) {
      // Clear preview URLs we own.
      for (const it of items) URL.revokeObjectURL(it.previewUrl)
      setItems([])
    } else {
      hydrate()
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadIds.join('|')])

  const remaining = maxFiles - items.length - (isUploading ? 1 : 0)
  const canAdd = items.length + (isUploading ? 1 : 0) < maxFiles

  const uploadFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      throw new Error(`Định dạng không hỗ trợ: ${file.type || 'unknown'}`)
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`File vượt quá ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB`)
    }
    await computeSha256(file) // ensure crypto.subtle works; hash sent by server-side calculation too

    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/media/upload', { method: 'POST', body: form })
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      throw new Error(detail.error ?? 'Upload thất bại')
    }
    return (await res.json()) as { uploadId: string; expiresAt: number; deduped: boolean }
  }, [])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null)
    const arr = Array.from(files)
    if (arr.length === 0) return
    const slotsLeft = maxFiles - items.length
    if (slotsLeft <= 0) {
      setError(`Tối đa ${maxFiles} ảnh.`)
      return
    }
    const toUpload = arr.slice(0, slotsLeft)
    setIsUploading(true)
    try {
      const uploaded: UploadedItem[] = []
      for (const file of toUpload) {
        try {
          const { uploadId, expiresAt } = await uploadFile(file)
          uploaded.push({
            uploadId,
            fileName: file.name,
            previewUrl: URL.createObjectURL(file),
            expiresAt,
          })
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err))
        }
      }
      if (uploaded.length === 0) return
      const newItems = [...items, ...uploaded]
      setItems(newItems)
      onChange(newItems.map(i => i.uploadId))
    } finally {
      setIsUploading(false)
    }
  }, [items, maxFiles, onChange, uploadFile])

  const handleRemove = useCallback((uploadId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.uploadId !== uploadId)
      const removed = prev.find(i => i.uploadId === uploadId)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      onChange(next.map(i => i.uploadId))
      return next
    })
  }, [onChange])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const counterText = useMemo(() => `${items.length}/${maxFiles}`, [items.length, maxFiles])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-midnight-ink">
          Đính kèm ảnh <span className="text-app-muted">({counterText})</span>
        </p>
        <p className="text-[11px] text-app-muted">
          Tối đa {maxFiles} ảnh · mỗi ảnh ≤ {Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB · JPG/PNG/WebP/GIF
        </p>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {items.map(item => (
            <div key={item.uploadId} className="group relative aspect-square overflow-hidden rounded-button border border-app-line bg-app-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt={item.fileName} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(item.uploadId)}
                className="absolute right-1 top-1 rounded-full bg-pitch-black/70 p-1 text-pure-canvas opacity-0 transition group-hover:opacity-100"
                aria-label="Xóa ảnh"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={
          'flex items-center gap-3 rounded-card border border-dashed px-3 py-3 transition ' +
          (isDragging ? 'border-sky-blue bg-hint-of-blue/40' : 'border-app-line bg-app-bg')
        }
      >
        <ImagePlus className="h-5 w-5 text-app-muted" />
        <p className="flex-1 text-xs text-app-muted">
          Kéo thả ảnh vào đây hoặc bấm nút bên phải để chọn từ máy. Ảnh là tùy chọn — có thể đăng text-only.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <Button
          size="sm"
          variant="white"
          disabled={!canAdd || isUploading}
          isLoading={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" /> {isUploading ? 'Đang tải...' : 'Chọn ảnh'}
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-sunset-orange">{error}</p>
      ) : null}
      {isUploading ? (
        <p className="flex items-center gap-2 text-[11px] text-app-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> Đang tải ảnh lên... (còn {remaining} ô trống)
        </p>
      ) : null}
    </div>
  )
}