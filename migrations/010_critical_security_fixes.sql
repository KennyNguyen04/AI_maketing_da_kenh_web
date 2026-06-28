-- ============================================================
-- Migration: Critical Security & Schema Fixes
-- Run in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================
-- Bug IDs:
--   DB-04 (P0 Critical Security): api_keys RLS not filtering by user_id
--   DB-01 (P1 Critical): Missing OAuth token columns on social_targets
--   DB-02 (P1 Critical): Missing scheduling fields on drafts
--   DB-03 (High): Missing FK constraints on user_id columns
--   DB-05 (Medium): Missing UNIQUE constraint on drafts(job_id, channel, version)
--   DB-06 (Medium): Missing UNIQUE constraint on repurpose_jobs(idempotency_key)
--   DB-07 (Medium): Missing CHECK constraints on drafts.publish_status
-- ============================================================

-- ============================================================
-- 1. DB-04: Fix api_keys RLS policy (WORST SECURITY BUG)
-- ============================================================
-- Before: any authenticated user could read/modify ANY api_keys row
-- After:  users can only access their own api_keys

-- 1.1 Drop existing policies (if any)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.api_keys;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.api_keys;
DROP POLICY IF EXISTS "Enable update for all users" ON public.api_keys;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view own api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can modify own api_keys" ON public.api_keys;

-- 1.2 Create strict per-user policies
CREATE POLICY "Users can view own api_keys"
  ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api_keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys"
  ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys"
  ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. DB-01: Add OAuth token columns to social_targets
-- ============================================================
-- Code in token-manager.ts expects:
--   access_token_encrypted, refresh_token_encrypted, token_expires_at, scopes
-- Currently missing → OAuth flow 100% broken

ALTER TABLE public.social_targets
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scopes TEXT[];

-- ============================================================
-- 3. DB-02: Add missing scheduling fields to drafts
-- ============================================================
-- Code in scheduler.worker.ts expects:
--   scheduled_for, processing_started_at, idempotency_key

ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- 3.1 Add publish_status column FIRST (must exist before CHECK constraint)
-- Values: 'draft' (chưa đăng), 'scheduled' (đã lên lịch), 'publishing' (đang đăng), 'published' (đã đăng), 'failed' (thất bại)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'drafts'
      AND column_name = 'publish_status'
  ) THEN
    ALTER TABLE public.drafts
      ADD COLUMN publish_status TEXT NOT NULL DEFAULT 'draft';
  END IF;
END $$;

-- 3.2 Now safe to add CHECK constraint
ALTER TABLE public.drafts
  DROP CONSTRAINT IF EXISTS drafts_publish_status_check;

ALTER TABLE public.drafts
  ADD CONSTRAINT drafts_publish_status_check
  CHECK (publish_status IN ('draft', 'scheduled', 'publishing', 'published', 'failed'));

ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 3.3 Ensure job_id column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'drafts'
      AND column_name = 'job_id'
  ) THEN
    ALTER TABLE public.drafts
      ADD COLUMN job_id UUID;
  END IF;
END $$;

-- 3.4 Ensure channel column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'drafts'
      AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.drafts
      ADD COLUMN channel TEXT;
  END IF;
END $$;

-- 3.5 Ensure version column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'drafts'
      AND column_name = 'version'
  ) THEN
    ALTER TABLE public.drafts
      ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Indexes for scheduler queries
CREATE INDEX IF NOT EXISTS idx_drafts_scheduled_for
  ON public.drafts(scheduled_for)
  WHERE scheduled_for IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_drafts_idempotency_key
  ON public.drafts(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- 4. DB-03: Add FK constraints on user_id columns
-- ============================================================
-- ON DELETE CASCADE: when user is deleted, their data is cleaned up

-- profiles is the parent (no FK needed for it)

ALTER TABLE public.api_keys
  DROP CONSTRAINT IF EXISTS fk_api_keys_user_id;

ALTER TABLE public.api_keys
  ADD CONSTRAINT fk_api_keys_user_id
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.brand_vaults
  DROP CONSTRAINT IF EXISTS fk_brand_vaults_user_id;

ALTER TABLE public.brand_vaults
  ADD CONSTRAINT fk_brand_vaults_user_id
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.drafts
  DROP CONSTRAINT IF EXISTS fk_drafts_user_id;

ALTER TABLE public.drafts
  ADD CONSTRAINT fk_drafts_user_id
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.repurpose_jobs
  DROP CONSTRAINT IF EXISTS fk_repurpose_jobs_user_id;

ALTER TABLE public.repurpose_jobs
  ADD CONSTRAINT fk_repurpose_jobs_user_id
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.social_targets
  DROP CONSTRAINT IF EXISTS fk_social_targets_user_id;

ALTER TABLE public.social_targets
  ADD CONSTRAINT fk_social_targets_user_id
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.extension_tasks
  DROP CONSTRAINT IF EXISTS fk_extension_tasks_user_id;

ALTER TABLE public.extension_tasks
  ADD CONSTRAINT fk_extension_tasks_user_id
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================================
-- 5. DB-05: UNIQUE constraint on drafts(job_id, channel, version)
-- ============================================================
-- Prevents duplicate drafts for same job+channel+version
-- (columns job_id, channel, version already ensured in section 3)

-- 5.1 Drop existing constraint (if any)
ALTER TABLE public.drafts
  DROP CONSTRAINT IF EXISTS uq_drafts_job_channel_version;

-- 5.2 Only add UNIQUE if no duplicates exist
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT job_id, channel, version
    FROM public.drafts
    WHERE job_id IS NOT NULL
    GROUP BY job_id, channel, version
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count = 0 THEN
    ALTER TABLE public.drafts
      ADD CONSTRAINT uq_drafts_job_channel_version
      UNIQUE (job_id, channel, version);
  ELSE
    RAISE NOTICE 'Skipped UNIQUE constraint on drafts: % duplicate (job_id, channel, version) tuples exist. Clean up first.', dup_count;
  END IF;
END $$;

-- ============================================================
-- 6. DB-06: UNIQUE constraint on repurpose_jobs(idempotency_key)
-- ============================================================
-- Ensure column exists first (migration 008 may have added it)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'repurpose_jobs'
      AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.repurpose_jobs
      ADD COLUMN idempotency_key TEXT;
  END IF;
END $$;

ALTER TABLE public.repurpose_jobs
  DROP CONSTRAINT IF EXISTS uq_repurpose_jobs_idempotency_key;

-- Only add UNIQUE if no duplicates exist (would otherwise fail)
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT idempotency_key
    FROM public.repurpose_jobs
    WHERE idempotency_key IS NOT NULL
    GROUP BY idempotency_key
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count = 0 THEN
    ALTER TABLE public.repurpose_jobs
      ADD CONSTRAINT uq_repurpose_jobs_idempotency_key
      UNIQUE (idempotency_key);
  ELSE
    RAISE NOTICE 'Skipped UNIQUE constraint: % duplicate idempotency_keys exist. Clean up first.', dup_count;
  END IF;
END $$;

-- ============================================================
-- 7. RLS policies for new columns (best practice)
-- ============================================================
-- Ensure social_targets + drafts RLS still works after column additions

-- social_targets: ensure per-user access
DROP POLICY IF EXISTS "Users can view own social_targets" ON public.social_targets;
CREATE POLICY "Users can view own social_targets"
  ON public.social_targets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can modify own social_targets" ON public.social_targets;
CREATE POLICY "Users can modify own social_targets"
  ON public.social_targets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- drafts: ensure per-user access (existing policy likely already correct, but enforce)
DROP POLICY IF EXISTS "Users can view own drafts" ON public.drafts;
CREATE POLICY "Users can view own drafts"
  ON public.drafts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can modify own drafts" ON public.drafts;
CREATE POLICY "Users can modify own drafts"
  ON public.drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. Verification queries (run after migration to verify)
-- ============================================================
-- SELECT * FROM public.api_keys LIMIT 1; -- should work as owner, fail as other user
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'social_targets' AND column_name LIKE '%token%';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'drafts' AND column_name IN ('scheduled_for', 'processing_started_at', 'idempotency_key');
