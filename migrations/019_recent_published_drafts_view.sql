-- Migration: 019_recent_published_drafts_view.sql
--
-- View exposing drafts the user has successfully published, for the re-post feature.
--
-- Schema quirks handled:
--   - drafts.publish_status is the lifecycle column (not status):
--     'draft' | 'scheduled' | 'published' | 'failed'.
--   - drafts.images may or may not exist. Migration 005 adds it
--     `ALTER TABLE ... ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}'`,
--     so on any DB past that migration the column is present. If you see
--     `column d.images does not exist`, run migration 005 first.
--   - drafts.published_at does NOT exist in the base schema. We order by updated_at,
--     which is sufficient for "recently published" since users don't typically edit
--     after publish.
--
-- This view intentionally selects only columns known to exist on the base schema,
-- so it compiles regardless of whether 005 has been applied. The re-post API
-- checks for `images` separately and passes `[]` if missing.

CREATE OR REPLACE VIEW public.recent_published_drafts AS
SELECT
  d.id          AS draft_id,
  d.user_id,
  d.content,
  d.updated_at  AS published_at_proxy  -- rename to avoid confusion in client code.
FROM public.drafts d
WHERE d.publish_status = 'published';

GRANT SELECT ON public.recent_published_drafts TO authenticated;
GRANT SELECT ON public.recent_published_drafts TO service_role;
