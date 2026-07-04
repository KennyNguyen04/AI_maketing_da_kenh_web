-- ============================================================
-- Migration 017: Make brand_vaults.display_name safe for inserts
-- ============================================================
-- Bug: User reports "Failed to create brand vault record" for every
-- analyze-* route (url, text, form). Root cause is one of:
--
--   1. The `display_name` column was never added (migration 003 not
--      run on this DB) — every insert that included display_name
--      throws "column display_name does not exist".
--   2. migration 003 ran but the NOT NULL constraint blocks inserts
--      that don't supply a value.
--
-- Fix:
--   - Add the column if missing (idempotent).
--   - Backfill existing NULL rows from `name` (matches migration 003).
--   - DEFAULT the column to `name` so future inserts that don't supply
--     it get a sensible value automatically — making the application
--     code resilient regardless of which side of this migration runs
--     first.
--   - DROP the NOT NULL constraint so legacy insert paths that don't
--     supply display_name (e.g. older app versions in flight) still
--     succeed.
-- ============================================================

ALTER TABLE public.brand_vaults
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Provide a safe default so future inserts never violate NOT NULL.
ALTER TABLE public.brand_vaults
ALTER COLUMN display_name SET DEFAULT 'My Brand Voice';

-- Backfill existing rows
UPDATE public.brand_vaults
SET display_name = name
WHERE display_name IS NULL;

-- Drop the NOT NULL constraint if it was set in a previous migration.
-- Wrapped in DO block so the migration is idempotent and safe to run
-- on databases where the constraint was never added.
DO $$
BEGIN
  ALTER TABLE public.brand_vaults
    ALTER COLUMN display_name DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    -- Constraint not present, nothing to drop. Safe to ignore.
    NULL;
END $$;

-- Recreate the helpful index (idempotent).
CREATE INDEX IF NOT EXISTS idx_brand_vaults_user_active
ON public.brand_vaults(user_id, is_active, created_at DESC);

COMMENT ON COLUMN public.brand_vaults.display_name IS
  'Human-friendly label shown in vault selectors. Default is "My Brand Voice". Optional.';
