-- Migration: 013_missing_audit_tables.sql (v2 - fixed)
-- Creates missing tables referenced by code:
--   - ai_generations (audit log for AI generations)
--   - alpha_feedback (admin feedback export)
--
-- v2 changes:
--   - Removed RLS policies that referenced non-existent 'role' column
--   - profiles uses 'user_plan' (not 'role') for admin check
--   - supabaseAdmin bypasses RLS, so admin-only policies are not needed
--     for server-side queries (they would only apply to client-side queries
--     via anon/authenticated roles, which never access these tables directly)

-- ============================================================
-- ai_generations table
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Users can view their own AI generation history (via authenticated client)
DROP POLICY IF EXISTS "Users can view own ai_generations" ON ai_generations;
CREATE POLICY "Users can view own ai_generations"
  ON ai_generations FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- alpha_feedback table
-- ============================================================
CREATE TABLE IF NOT EXISTS alpha_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  rating INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_alpha_feedback_rating
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE INDEX IF NOT EXISTS idx_alpha_feedback_user_id ON alpha_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_alpha_feedback_created_at ON alpha_feedback(created_at DESC);

ALTER TABLE alpha_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback (anonymous or logged-in)
DROP POLICY IF EXISTS "Anyone can submit feedback" ON alpha_feedback;
CREATE POLICY "Anyone can submit feedback"
  ON alpha_feedback FOR INSERT
  WITH CHECK (true);

-- Only admins can view feedback (via authenticated client)
-- Uses user_plan (not role) since that's the actual schema
DROP POLICY IF EXISTS "Admins can view feedback" ON alpha_feedback;
CREATE POLICY "Admins can view feedback"
  ON alpha_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_plan = 'admin'
    )
  );