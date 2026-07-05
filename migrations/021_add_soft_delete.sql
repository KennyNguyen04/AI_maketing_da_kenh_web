-- ============================================================
-- Migration 021: Soft delete flag for drafts, repurpose_jobs, brand_vaults
-- ============================================================
-- Why soft delete: project rule (no-delete user data) + allow undo
-- of accidental user clicks. We never hard-delete user content.
--
-- Pattern:
--   - is_deleted=false (default): visible everywhere.
--   - is_deleted=true: hidden from UI, kept in DB for audit.
--   - All user-facing SELECT queries MUST filter .eq('is_deleted', false).
--   - Admin/worker queries may omit the filter (debug/audit visibility).
--
-- Idempotency: ADD COLUMN IF NOT EXISTS is supported in PG 9.6+.
-- ============================================================

ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.repurpose_jobs
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.brand_vaults
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.drafts.is_deleted IS
  'Soft delete flag — hidden from user UI but kept in DB for audit/recovery. Set true after DELETE call.';

COMMENT ON COLUMN public.repurpose_jobs.is_deleted IS
  'Soft delete flag — hides from /dashboard list. Cascade hides drafts where FK job_id points here.';

COMMENT ON COLUMN public.brand_vaults.is_deleted IS
  'Soft delete flag — hides from NewJobForm selector. Old jobs keep brand_vault_id (nullable FK).';
