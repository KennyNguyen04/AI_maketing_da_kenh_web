-- ============================================================
-- Migration: Add Lock Columns for Scheduler Concurrency
-- Prevents 2 cron instances from picking up same draft
-- Safe to re-run (all operations are idempotent)
-- ============================================================

-- 1. Lock column on drafts (atomic claim for scheduler)
ALTER TABLE public.drafts
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

-- 2. Index for finding stale "processing" claims (left by crashed workers)
CREATE INDEX IF NOT EXISTS idx_drafts_processing_claim
ON public.drafts(processing_started_at)
WHERE processing_started_at IS NOT NULL;

-- 3. Unique partial index on publish_attempts (only created if table exists)
-- Prevents 2 concurrent publish requests from inserting 'publishing' rows for same draft
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_publishing_per_draft') THEN
    -- Check if publish_attempts table exists before creating the index
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'publish_attempts'
    ) THEN
      CREATE UNIQUE INDEX uniq_publishing_per_draft
      ON public.publish_attempts(draft_id, provider)
      WHERE status = 'publishing';
    ELSE
      RAISE NOTICE 'Table public.publish_attempts does not exist yet — skipping uniq_publishing_per_draft index. Run this migration again after the table is created.';
    END IF;
  END IF;
END $$;