-- ============================================================
-- Migration 023: Add 'threads' to drafts.channel CHECK constraint
-- ============================================================
-- Why: NewJobForm on 2026-07-15 added Threads as a user-facing
-- channel option. Threads automator (extension/automators/threads.js)
-- has been wired for some time, AI config (lib/ai/config.ts) and
-- prompt (lib/ai/prompts.ts) already exist, but migration 020 narrowed
-- the drafts.channel CHECK to {linkedin_post, linkedin_thread, facebook, x}
-- to align with VALID_CHANNELS at the time. Adding Threads here so the
-- Inngest worker (lib/inngest/repurpose.worker.ts step 5) can insert
-- drafts with channel='threads' without violating the constraint.
--
-- Idempotent: DROP IF EXISTS then ADD. Mirrors the pattern from
-- migration 020 so this can be re-run safely.
-- ============================================================

ALTER TABLE public.drafts DROP CONSTRAINT IF EXISTS drafts_channel_check;

ALTER TABLE public.drafts
  ADD CONSTRAINT drafts_channel_check
  CHECK (channel IN ('linkedin_post', 'linkedin_thread', 'facebook', 'x', 'threads'));

COMMENT ON CONSTRAINT drafts_channel_check ON public.drafts IS
  'Canonical channels for drafts. Must match lib/types/job.ts Channel type. LinkedIn, Facebook, X, Threads. Instagram / Facebook-Group and others are planned but not yet wired for user-facing form.';
