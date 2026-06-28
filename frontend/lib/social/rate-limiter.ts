/**
 * Rate Limiter for Social Media APIs
 * Prevents account suspension by enforcing platform limits
 */

interface RateLimitEntry {
  count: number
  resetAt: Date
  lastPostAt: Date | null
}

interface RateLimitConfig {
  limit: number
  windowMinutes: number
  minDelayMinutes: number
}

export const PROVIDER_CONFIGS: Record<string, RateLimitConfig> = {
  x: {
    limit: 50,           // X allows ~50 tweets per 6 hours
    windowMinutes: 6 * 60,
    minDelayMinutes: 30,  // Minimum 30 min between posts
  },
  facebook: {
    limit: 25,           // Facebook allows ~25 posts per 24 hours
    windowMinutes: 24 * 60,
    minDelayMinutes: 15, // Minimum 15 min between posts
  },
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()

  /**
   * Generate storage key for user+provider combination
   */
  private getKey(userId: string, provider: string): string {
    return `${provider}:${userId}`
  }

  /**
   * Get or create rate limit entry for user+provider
   */
  private getEntry(userId: string, provider: string): RateLimitEntry {
    const key = this.getKey(userId, provider)
    const now = new Date()

    const existing = this.store.get(key)
    if (existing && existing.resetAt > now) {
      return existing
    }

    // Create new entry
    const config = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.facebook
    return {
      count: 0,
      resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
      lastPostAt: null,
    }
  }

  /**
   * Update rate limit entry after successful post
   */
  private updateEntry(userId: string, provider: string): void {
    const key = this.getKey(userId, provider)
    const entry = this.getEntry(userId, provider)
    entry.count++
    entry.lastPostAt = new Date()
    this.store.set(key, entry)
  }

  /**
   * Check if user can post (within rate limits)
   */
  canPost(userId: string, provider: string): { allowed: boolean; reason?: string; retryAfter?: number } {
    const config = PROVIDER_CONFIGS[provider]
    if (!config) {
      // Unknown provider, allow but log warning
      console.warn(`Unknown provider: ${provider}, allowing by default`)
      return { allowed: true }
    }

    const entry = this.getEntry(userId, provider)
    const now = new Date()

    // Check if window has reset
    if (entry.resetAt <= now) {
      // Reset window
      entry.count = 0
      entry.resetAt = new Date(now.getTime() + config.windowMinutes * 60 * 1000)
    }

    // Check rate limit
    if (entry.count >= config.limit) {
      const retryAfterMs = entry.resetAt.getTime() - now.getTime()
      return {
        allowed: false,
        reason: `Rate limit exceeded. You can post again in ${Math.ceil(retryAfterMs / 60000)} minutes.`,
        retryAfter: Math.ceil(retryAfterMs / 60000),
      }
    }

    // Check minimum delay between posts
    if (entry.lastPostAt) {
      const timeSinceLastPost = now.getTime() - entry.lastPostAt.getTime()
      const minDelayMs = config.minDelayMinutes * 60 * 1000

      if (timeSinceLastPost < minDelayMs) {
        const retryAfterMs = minDelayMs - timeSinceLastPost
        return {
          allowed: false,
          reason: `Please wait ${Math.ceil(retryAfterMs / 60000)} more minutes before posting again.`,
          retryAfter: Math.ceil(retryAfterMs / 60000),
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Record a successful post
   */
  recordPost(userId: string, provider: string): void {
    this.updateEntry(userId, provider)
  }

  /**
   * Get remaining posts for user+provider
   */
  getRemainingPosts(userId: string, provider: string): number {
    const config = PROVIDER_CONFIGS[provider]
    if (!config) return Infinity

    const entry = this.getEntry(userId, provider)
    return Math.max(0, config.limit - entry.count)
  }

  /**
   * Get reset time for user+provider
   */
  getResetTime(userId: string, provider: string): Date | null {
    const entry = this.getEntry(userId, provider)
    return entry.resetAt
  }

  /**
   * Get time until next post is allowed
   */
  getTimeUntilNextPost(userId: string, provider: string): number | null {
    const config = PROVIDER_CONFIGS[provider]
    if (!config) return null

    const entry = this.getEntry(userId, provider)
    const now = new Date()

    // Check minimum delay
    if (entry.lastPostAt) {
      const minDelayMs = config.minDelayMinutes * 60 * 1000
      const timeSinceLastPost = now.getTime() - entry.lastPostAt.getTime()
      if (timeSinceLastPost < minDelayMs) {
        return minDelayMs - timeSinceLastPost
      }
    }

    return null
  }

  /**
   * Clear rate limit for user+provider (for testing or admin override)
   */
  clear(userId: string, provider: string): void {
    const key = this.getKey(userId, provider)
    this.store.delete(key)
  }

  /**
   * Clear all rate limits (for testing)
   */
  clearAll(): void {
    this.store.clear()
  }
}

// Singleton instance for in-memory rate limiting
export const rateLimiter = new RateLimiter()
