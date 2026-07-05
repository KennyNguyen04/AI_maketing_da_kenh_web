-- Phase 0.3 TEST 1: Verify view 019 columns
-- Should return 6 columns exactly as documented in plan
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'recent_published_drafts'
ORDER BY ordinal_position;
