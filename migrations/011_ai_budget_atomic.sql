-- Migration: 011_ai_budget_atomic.sql
-- Fixes race condition in lib/ai/budget.ts (S2-1)
-- Replaces in-memory Map with DB-backed atomic counter

-- Create per-user daily AI generation budget table
CREATE TABLE IF NOT EXISTS ai_budget_counters (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
  remaining INTEGER NOT NULL DEFAULT 50,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '1 day'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ai_budget_remaining_nonneg CHECK (remaining >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ai_budget_counters_date_key ON ai_budget_counters(date_key);

-- Enable RLS
ALTER TABLE ai_budget_counters ENABLE ROW LEVEL SECURITY;

-- Users can only view their own budget counter
DROP POLICY IF EXISTS "Users can view own ai_budget" ON ai_budget_counters;
CREATE POLICY "Users can view own ai_budget"
  ON ai_budget_counters FOR SELECT
  USING (auth.uid() = user_id);

-- Atomic decrement function (server-side only)
CREATE OR REPLACE FUNCTION consume_ai_budget(p_user_id UUID, p_daily_limit INTEGER DEFAULT 50)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_today TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  v_tomorrow TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '1 day';
  v_remaining INTEGER;
BEGIN
  -- Upsert row for today, resetting counter if date_key differs
  INSERT INTO ai_budget_counters (user_id, date_key, remaining, reset_at, updated_at)
  VALUES (p_user_id, v_today, p_daily_limit - 1, v_tomorrow, now())
  ON CONFLICT (user_id) DO UPDATE
    SET date_key = EXCLUDED.date_key,
        remaining = CASE
          WHEN ai_budget_counters.date_key <> EXCLUDED.date_key THEN p_daily_limit - 1
          WHEN ai_budget_counters.remaining > 0 THEN ai_budget_counters.remaining - 1
          ELSE 0
        END,
        reset_at = CASE
          WHEN ai_budget_counters.date_key <> EXCLUDED.date_key THEN EXCLUDED.reset_at
          ELSE ai_budget_counters.reset_at
        END,
        updated_at = now()
    WHERE ai_budget_counters.user_id = p_user_id
  RETURNING ai_budget_counters.remaining, ai_budget_counters.reset_at INTO v_remaining, reset_at;

  RETURN QUERY SELECT (v_remaining >= 0), v_remaining, reset_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic read function (for checkAiBudget)
CREATE OR REPLACE FUNCTION check_ai_budget(p_user_id UUID, p_daily_limit INTEGER DEFAULT 50)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_today TEXT := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  v_tomorrow TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '1 day';
  v_row ai_budget_counters%ROWTYPE;
BEGIN
  -- Try to fetch existing row
  SELECT * INTO v_row FROM ai_budget_counters WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- No row yet — full budget available
    RETURN QUERY SELECT TRUE, p_daily_limit, v_tomorrow;
    RETURN;
  END IF;

  -- Reset if new day
  IF v_row.date_key <> v_today THEN
    RETURN QUERY SELECT TRUE, p_daily_limit, v_tomorrow;
    RETURN;
  END IF;

  RETURN QUERY SELECT (v_row.remaining > 0), v_row.remaining, v_row.reset_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;