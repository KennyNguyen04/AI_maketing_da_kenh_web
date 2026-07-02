-- Migration: 015_voice_analysis_cache.sql
-- Per-user cache for Brand Voice analysis to avoid repeated Gemini calls.

CREATE TABLE IF NOT EXISTS voice_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('text', 'url', 'form')),
  profile JSONB NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_hash, source_type)
);

CREATE INDEX IF NOT EXISTS idx_voice_cache_user_hash
  ON voice_analysis_cache (user_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_voice_cache_last_used
  ON voice_analysis_cache (last_used_at DESC);

ALTER TABLE voice_analysis_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own voice cache" ON voice_analysis_cache;
CREATE POLICY "Users manage own voice cache"
  ON voice_analysis_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
