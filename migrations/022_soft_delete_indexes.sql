-- ============================================================
-- Migration 022: Partial indexes for active (non-deleted) rows
-- ============================================================
-- Why partial: the vast majority of SELECT queries WILL filter
-- is_deleted=false. A partial index is smaller, faster, and
-- supported by query planner better than a full index + filter.

CREATE INDEX IF NOT EXISTS idx_drafts_active
  ON public.drafts(user_id, job_id)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_jobs_active
  ON public.repurpose_jobs(user_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_vaults_active
  ON public.brand_vaults(user_id)
  WHERE is_deleted = false;
