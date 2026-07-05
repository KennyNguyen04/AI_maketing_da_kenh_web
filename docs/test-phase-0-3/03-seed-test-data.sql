-- Phase 0.3 TEST 3 (REVISED): Seed minimal test data (idempotent)
--
-- The unique constraint uq_drafts_job_channel_version on (job_id, channel, version)
-- means we cannot reuse version=1 for the same (job, channel). We always:
--   - use MAX(version)+1
--   - delete any previous TEST_* content first
--
-- We also handle the case where the seed draft already exists by deleting
-- the entire TEST_* chain before re-inserting.

DO $$
DECLARE
  v_user_id UUID;
  v_job_id  UUID;
  v_draft_published_id UUID;
  v_draft_draft_id     UUID;
  v_version_published  INT;
  v_version_draft      INT;
BEGIN
  -- Pick the first auth user (any one will do)
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found. Sign up a test user first.';
  END IF;

  -- Clean up any prior runs of THIS seed script
  DELETE FROM public.drafts
   WHERE content IN ('TEST_PUBLISHED_CONTENT_v1', 'TEST_DRAFT_CONTENT_v1');

  DELETE FROM public.repurpose_jobs
   WHERE source_content = 'TEST_SEED_CONTENT_v1_for_recent_published_view';

  -- Create a fresh repurpose_job
  INSERT INTO public.repurpose_jobs (user_id, source_type, source_content)
  VALUES (v_user_id, 'text', 'TEST_SEED_CONTENT_v1_for_recent_published_view')
  RETURNING id INTO v_job_id;

  -- Determine next versions so we never collide with existing drafts.
  SELECT COALESCE(MAX(version), 0) + 1
    INTO v_version_published
    FROM public.drafts
   WHERE job_id = v_job_id AND channel = 'facebook';

  v_version_draft := v_version_published + 1;

  -- Insert a draft with publish_status='published' (the row view 019 should return)
  INSERT INTO public.drafts (user_id, job_id, channel, content, publish_status, version, is_current)
  VALUES (v_user_id, v_job_id, 'facebook', 'TEST_PUBLISHED_CONTENT_v1', 'published', v_version_published, true)
  RETURNING id INTO v_draft_published_id;

  -- Insert a draft that is NOT published (should be filtered out)
  INSERT INTO public.drafts (user_id, job_id, channel, content, publish_status, version, is_current)
  VALUES (v_user_id, v_job_id, 'facebook', 'TEST_DRAFT_CONTENT_v1', 'draft', v_version_draft, true)
  RETURNING id INTO v_draft_draft_id;

  RAISE NOTICE 'Seed complete. user_id=%, published_draft_id=%, draft_draft_id=%',
    v_user_id, v_draft_published_id, v_draft_draft_id;
END $$;

-- After seeding, view should now return exactly 1 row (the published draft).
SELECT COUNT(*) AS view_rows_should_be_1 FROM public.recent_published_drafts;