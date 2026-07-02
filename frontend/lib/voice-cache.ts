/**
 * Per-user cache layer for Brand Voice analysis.
 * Avoids repeated Gemini calls when same content is analyzed multiple times.
 */
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type CacheSourceType = 'text' | 'url' | 'form'

export interface CachedVoiceProfile {
  tone?: string | string[]
  system_prompt_cache?: string
  [key: string]: unknown
}

export function hashContent(text: string): string {
  const normalized = text
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

export async function getCachedProfile(
  userId: string,
  content: string,
  sourceType: CacheSourceType,
): Promise<CachedVoiceProfile | null> {
  const hash = hashContent(content)
  const { data } = await supabaseAdmin
    .from('voice_analysis_cache')
    .select('profile, hit_count')
    .eq('user_id', userId)
    .eq('content_hash', hash)
    .eq('source_type', sourceType)
    .maybeSingle()

  if (!data) return null

  void supabaseAdmin
    .from('voice_analysis_cache')
    .update({
      hit_count: (data.hit_count ?? 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('content_hash', hash)
    .eq('source_type', sourceType)

  return data.profile
}

export async function saveToCache(
  userId: string,
  content: string,
  sourceType: CacheSourceType,
  profile: CachedVoiceProfile,
): Promise<void> {
  const hash = hashContent(content)
  await supabaseAdmin.from('voice_analysis_cache').upsert(
    {
      user_id: userId,
      content_hash: hash,
      source_type: sourceType,
      profile,
    },
    { onConflict: 'user_id,content_hash,source_type' },
  )
}
