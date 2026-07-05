-- Phase 0.3 TEST 5: Cleanup seed data
-- Removes all TEST_*-tagged rows so we don't pollute the production DB.

DELETE FROM public.drafts
WHERE content IN (
  'TEST_PUBLISHED_CONTENT_v1',
  'TEST_DRAFT_CONTENT_v1'
);

DELETE FROM public.repurpose_jobs
WHERE source_content = 'TEST_SEED_CONTENT_v1_for_recent_published_view';

-- Final state check: view should be empty again
SELECT COUNT(*) AS remaining_published FROM public.recent_published_drafts;
