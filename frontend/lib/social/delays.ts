/**
 * Anti-Shadowban Delay Utilities
 * Randomized delays between posts to avoid spam detection
 */

const MIN_DELAY_MS = 5 * 60 * 1000    // 5 minutes
const MAX_DELAY_MS = 20 * 60 * 1000   // 20 minutes

/**
 * Generate a random delay between posts in milliseconds
 * Range: 5-20 minutes (configurable)
 */
export function randomDelay(minMs = MIN_DELAY_MS, maxMs = MAX_DELAY_MS): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
}

/**
 * Format milliseconds to human readable string
 */
export function formatDelay(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds > 0 ? `${seconds}s` : ''}`.trim()
  }
  return `${seconds} second${seconds !== 1 ? 's' : ''}`
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if delay is needed based on last post time
 */
export function needsDelay(lastPostAt: Date | null, minGapMinutes = 30): boolean {
  if (!lastPostAt) return false

  const gapMs = Date.now() - lastPostAt.getTime()
  const minGapMs = minGapMinutes * 60 * 1000

  return gapMs < minGapMs
}

/**
 * Calculate recommended delay based on posting frequency
 * More frequent posts get longer delays
 */
export function calculateRecommendedDelay(
  postsToday: number,
  maxDailyPosts: number
): number {
  // Linear scale: more posts = longer minimum delay
  const usageRatio = postsToday / maxDailyPosts

  if (usageRatio < 0.3) {
    // Low usage - 5-10 min delay
    return randomDelay(5 * 60 * 1000, 10 * 60 * 1000)
  } else if (usageRatio < 0.6) {
    // Medium usage - 10-15 min delay
    return randomDelay(10 * 60 * 1000, 15 * 60 * 1000)
  } else if (usageRatio < 0.8) {
    // High usage - 15-25 min delay
    return randomDelay(15 * 60 * 1000, 25 * 60 * 1000)
  } else {
    // Near limit - 25-40 min delay
    return randomDelay(25 * 60 * 1000, 40 * 60 * 1000)
  }
}
