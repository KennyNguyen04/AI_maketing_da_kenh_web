-- Migration: 012_atomic_publish_attempts.sql
-- Fixes race condition in publish flow (S2-2 / H-02)
-- ALSO creates the missing `publish_attempts` table that code expects
-- (Bug: code references this table in 15+ files but it was never created)

-- ============================================================
-- 1. Create publish_attempts table
-- ============================================================
CREATE TABLE IF NOT EXISTS publish_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT,
  external_post_id TEXT,
  external_post_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_publish_attempts_status
    CHECK (status IN ('draft', 'publishing', 'published', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_publish_attempts_draft_id ON publish_attempts(draft_id);
CREATE INDEX IF NOT EXISTS idx_publish_attempts_user_id ON publish_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_publish_attempts_status ON publish_attempts(status);
CREATE INDEX IF NOT EXISTS idx_publish_attempts_created_at ON publish_attempts(created_at DESC);

-- ============================================================
-- 2. Enable RLS
-- ============================================================
ALTER TABLE publish_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own publish_attempts" ON publish_attempts;
CREATE POLICY "Users can view own publish_attempts"
  ON publish_attempts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own publish_attempts" ON publish_attempts;
CREATE POLICY "Users can insert own publish_attempts"
  ON publish_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own publish_attempts" ON publish_attempts;
CREATE POLICY "Users can update own publish_attempts"
  ON publish_attempts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. Partial unique index: only one 'publishing' attempt per (draft_id, provider)
-- ============================================================
-- Allows multiple historical rows ('published', 'failed', 'draft')
-- but only ONE in-flight 'publishing' row at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_publish_attempts_active
  ON publish_attempts (draft_id, provider)
  WHERE status = 'publishing';

-- ============================================================
-- 4. Atomic claim helper: returns attempt id if claimed, NULL if conflict
-- ============================================================
CREATE OR REPLACE FUNCTION claim_publish_attempt(
  p_draft_id UUID,
  p_user_id UUID,
  p_provider TEXT,
  p_target_id TEXT,
  p_target_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO publish_attempts (draft_id, user_id, provider, target_id, target_name, status)
  VALUES (p_draft_id, p_user_id, p_provider, p_target_id, p_target_name, 'publishing')
  ON CONFLICT (draft_id, provider) WHERE status = 'publishing' DO NOTHING
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;