/**
 * Type declarations cho extension/lib/helpers.js.
 *
 * File .js không có types, nhưng Vitest test (TypeScript) cần khai báo shape
 * để typecheck pass. Nếu sau này refactor helpers.js sang TypeScript thật,
 * file này có thể xóa.
 */

export interface RetryOptions {
  maxRetries?: number
  baseMs?: number
}

export interface ProcessingStateTask {
  id: string
  channel: string
  content: string
  images?: string[]
  target_id?: string | null
  target_type?: string | null
}

export interface ProcessingStatePair {
  processingState: {
    id: string
    channel: string
    tabId: number
    retryCount: number
    stage: string
    background: boolean
    startedAt: number
  }
  automatorPayload: {
    id: string
    content: string
    channel: string
    target_id: string | null
    target_type: string | null
    images: string[]
  }
}

export interface StaleTask {
  status: string
  updated_at?: string
}

export interface ReadyTask {
  priority?: number
  scheduled_for?: string
}

export function shouldRetryTask(retryCount: unknown, maxRetries?: number): boolean
export function calculateRetryDelay(retryCount: number, baseMs?: number): number
export function buildProcessingState(
  task: ProcessingStateTask,
  tabId: number,
  runInBackground: boolean | undefined | null,
): ProcessingStatePair
export function getChannelDisplayName(channel: string): string
export function getPlatformUrl(task: { channel: string; target_id?: string }): string
export function isStaleProcessingTask(
  task: StaleTask | null | undefined,
  now?: number,
  thresholdMs?: number,
): boolean
export function isTaskReadyNow(
  task: ReadyTask | null | undefined,
  now?: number,
): boolean
export function isSupportedPlatformUrl(url: unknown): boolean

export const SUPPORTED_CHANNELS: string[]
