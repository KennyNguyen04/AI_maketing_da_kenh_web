-- ============================================================
-- Migration 020: Align drafts channel CHECK with application code
-- ============================================================
-- Bug: User creates content via Brand Vault → "Failed to insert drafts:
-- new row for relation 'drafts' violates check constraint
-- 'drafts_channel_check'".
--
-- Root cause: the canonical channel list in code (lib/types/job.ts) is
--   'linkedin_post' | 'linkedin_thread' | 'facebook' | 'x'
-- but migration 006/007 replaced the old CHECK with a non-overlapping
-- set:
--   ('facebook', 'x', 'threads', 'instagram', 'facebook-group')
-- Only 'facebook' and 'x' overlap. LinkedIn channels fail the
-- constraint on insert.
--
-- Fix: replace the CHECK so it matches the canonical channels the
-- application actually inserts. Migration is idempotent (DROP IF EXISTS
-- then ADD). We DO NOT touch the deprecated 'twitter' alias here:
-- migration 005 already remaps historical drafts to 'x', and
-- lib/validation/api.ts normalises 'twitter' → 'x' on the way in, so
-- no new 'twitter' rows will be inserted.
--
-- Note for future contributors: any time you add a channel to
-- lib/types/job.ts, you must add a matching migration that updates
-- this CHECK constraint, or inserts will fail with this exact error.
-- ============================================================

ALTER TABLE public.drafts DROP CONSTRAINT IF EXISTS drafts_channel_check;

ALTER TABLE public.drafts
  ADD CONSTRAINT drafts_channel_check
  CHECK (channel IN ('linkedin_post', 'linkedin_thread', 'facebook', 'x'));

COMMENT ON CONSTRAINT drafts_channel_check ON public.drafts IS
  'Canonical channels for drafts. Must match lib/types/job.ts Channel type. LinkedIn / Facebook / X only (Instagram, Threads, FB-Group and others are planned but not yet wired).';