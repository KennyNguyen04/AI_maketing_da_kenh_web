/**
 * Hashtag Rotation Utilities
 * Prevents repetitive hashtag patterns that trigger spam detection
 */

interface HashtagRotationEntry {
  hashtags: string[]
  lastUsed: Date
  weeklyCount: number
}

const MAX_HASHTAGS_PER_POST = 5
const MIN_HASHTAGS_PER_POST = 2
const WEEKLY_HASHTAG_RESET_HOURS = 168 // 7 days

/**
 * Extract hashtags from content
 */
export function extractHashtags(content: string): string[] {
  const hashtagRegex = /#[\w\u00C0-\u024F]+/g
  const matches = content.match(hashtagRegex)
  return matches ? matches.map((tag) => tag.toLowerCase()) : []
}

/**
 * Remove hashtags from content
 */
export function removeHashtags(content: string): string {
  return content.replace(/#[\w\u00C0-\u024F]+/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Generate a hashtag set that's different from recently used ones
 */
export function rotateHashtags(
  suggestedHashtags: string[],
  recentlyUsed: string[],
  minTags = MIN_HASHTAGS_PER_POST,
  maxTags = MAX_HASHTAGS_PER_POST
): string[] {
  if (suggestedHashtags.length === 0) return []

  // Normalize all hashtags to lowercase
  const normalized = suggestedHashtags.map((tag) => tag.toLowerCase())
  const recentLower = recentlyUsed.map((tag) => tag.toLowerCase())

  // Filter out recently used hashtags
  const available = normalized.filter((tag) => !recentLower.includes(tag))

  // If we don't have enough available, use some from recent (with rotation)
  let pool = available
  if (pool.length < minTags) {
    const needed = minTags - pool.length
    const recentPool = recentLower.filter((tag) => normalized.includes(tag))
    // Get the oldest used hashtags first
    pool = [...pool, ...recentLower.slice(0, needed)]
  }

  // Shuffle and pick
  const shuffled = shuffleArray(pool)
  const count = Math.min(Math.max(minTags, Math.floor(Math.random() * (maxTags - minTags + 1)) + minTags), shuffled.length)

  return shuffled.slice(0, count)
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Analyze hashtag diversity for a user
 * Returns a warning if hashtags are too repetitive
 */
export function analyzeHashtagDiversity(
  hashtagsUsed: string[],
  newHashtags: string[]
): { warning: boolean; message?: string } {
  const recentLower = hashtagsUsed.map((t) => t.toLowerCase())
  const newLower = newHashtags.map((t) => t.toLowerCase())

  // Check overlap ratio
  const overlap = newLower.filter((t) => recentLower.includes(t)).length
  const overlapRatio = newLower.length > 0 ? overlap / newLower.length : 0

  if (overlapRatio > 0.8) {
    return {
      warning: true,
      message: 'Các hashtag này đã được sử dụng nhiều lần gần đây. Cân nhắc thay đổi để tránh bị đánh giá là spam.',
    }
  }

  return { warning: false }
}

/**
 * Suggest alternative hashtags based on content
 * This is a placeholder - in production, this could use AI or a hashtag database
 */
export function suggestHashtagsFromContent(content: string): string[] {
  // Extract potential keywords from content
  const words = content.toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4)

  // Common industry/generic hashtags to potentially add
  const genericHashtags: Record<string, string[]> = {
    marketing: ['#Marketing', '#DigitalMarketing', '#ContentMarketing', '#MarketingStrategy'],
    tech: ['#Technology', '#Tech', '#Innovation', '#DigitalTransformation'],
    business: ['#Business', '#Entrepreneur', '#StartUp', '#BusinessTips'],
    social: ['#SocialMedia', '#SocialMediaMarketing', '#SocialMediaStrategy'],
    ai: ['#AI', '#ArtificialIntelligence', '#MachineLearning', '#AITech'],
    career: ['#Career', '#CareerAdvice', '#ProfessionalDevelopment', '#JobTips'],
  }

  // Match content words with generic hashtags
  const suggestions: string[] = []
  for (const [keyword, tags] of Object.entries(genericHashtags)) {
    if (words.some((word) => word.includes(keyword))) {
      suggestions.push(...tags)
    }
  }

  return [...new Set(suggestions)].slice(0, 10)
}
