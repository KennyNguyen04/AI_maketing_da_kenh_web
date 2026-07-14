import { describe, it, expect } from 'vitest'
import { getChannelBadgeColor, SUPPORTED_CHANNELS } from './channel-badge'

/**
 * P0-2 regression test: trước fix, tất cả channel đều render badge `bg-sky-blue`.
 * Sau fix, mỗi channel có màu riêng. Test này sẽ fail nếu ai đó revert fix
 * và vô tình hard-code một màu duy nhất cho mọi channel.
 */
describe('SchedulerCalendar: getChannelBadgeColor', () => {
  it('returns unique color for each canonical channel', () => {
    // Legacy alias 'twitter' intentionally shares color with 'x' (đó là design —
    // mục đích chính là phân biệt giữa các platform, không phải giữa alias).
    const canonicalChannels = ['facebook', 'facebook-group', 'threads', 'instagram', 'x', 'linkedin_post', 'linkedin_thread']
    const colors = canonicalChannels.map(c => getChannelBadgeColor(c))
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(canonicalChannels.length)
  })

  it('returns correct color for facebook', () => {
    expect(getChannelBadgeColor('facebook')).toBe('bg-sky-blue')
  })

  it('returns correct color for facebook-group', () => {
    expect(getChannelBadgeColor('facebook-group')).toBe('bg-indigo-500')
  })

  it('returns correct color for threads', () => {
    expect(getChannelBadgeColor('threads')).toBe('bg-purple-500')
  })

  it('returns correct color for instagram', () => {
    expect(getChannelBadgeColor('instagram')).toBe('bg-pink-500')
  })

  it('returns correct color for x', () => {
    expect(getChannelBadgeColor('x')).toBe('bg-midnight-ink')
  })

  it('returns same color for twitter alias as x', () => {
    // Legacy alias từ trước rebrand Twitter → X
    expect(getChannelBadgeColor('twitter')).toBe(getChannelBadgeColor('x'))
  })

  it('returns correct color for linkedin_post', () => {
    expect(getChannelBadgeColor('linkedin_post')).toBe('bg-blue-700')
  })

  it('returns correct color for linkedin_thread', () => {
    expect(getChannelBadgeColor('linkedin_thread')).toBe('bg-blue-500')
  })

  it('falls back to default for unknown channels', () => {
    expect(getChannelBadgeColor('unknown-channel')).toBe('bg-sky-blue')
    expect(getChannelBadgeColor('')).toBe('bg-sky-blue')
  })

  it('returns non-empty string for all supported channels', () => {
    for (const channel of SUPPORTED_CHANNELS) {
      const color = getChannelBadgeColor(channel)
      expect(color).toBeTruthy()
      expect(typeof color).toBe('string')
      expect(color).toMatch(/^bg-/)
    }
  })

  it('SUPPORTED_CHANNELS includes all canonical extension channels', () => {
    // Phải khớp với enum `extension_tasks.channel` trong supabase-schema.sql
    const expectedCanonical = ['facebook', 'facebook-group', 'threads', 'instagram', 'x']
    for (const c of expectedCanonical) {
      expect(SUPPORTED_CHANNELS).toContain(c)
    }
  })
})
