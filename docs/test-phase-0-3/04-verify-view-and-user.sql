-- Phase 0.3 TEST 4: Verify view returns the seeded published draft

-- 4a. View should now return 1 row (the published draft only)
SELECT
  draft_id,
  user_id,
  published_at_proxy,
  LENGTH(content) AS content_len,
  SUBSTR(content, 1, 30) AS preview
FROM public.recent_published_drafts
ORDER BY published_at_proxy DESC;

-- 4b. Compare with raw drafts query (same data, just to confirm filter)
SELECT
  id,
  content,
  publish_status,
  updated_at
FROM public.drafts
WHERE publish_status = 'published'
ORDER BY updated_at DESC;

-- 4c. Get the user_id for later curl test of GET /api/extension/recent-drafts
-- This is the value you'll pass as the test "user_id" context.
-- Also we'll create an API key for that user if missing.
SELECT
  u.id AS user_id,
  u.email,
  (SELECT key_prefix FROM public.api_keys
     WHERE user_id = u.id AND key_prefix IS NOT NULL
     ORDER BY created_at DESC LIMIT 1) AS existing_key_prefix
FROM auth.users u
ORDER BY u.created_at
LIMIT 5;
