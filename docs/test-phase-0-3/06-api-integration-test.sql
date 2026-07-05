-- Phase 0.3 TEST 6 (REVISED): Integration test instructions
--
-- No SQL here — pure instructions because dollar-quoting in SQL conflicts with
-- the placeholder syntax. Step 6 is entirely manual in PowerShell.

/*
=== STEP A: get auth user_id ===

Run this query in SQL Editor:

  SELECT u.id AS user_id, u.email
  FROM auth.users u
  ORDER BY u.created_at
  LIMIT 1;

Copy the user_id output (UUID).

=== STEP B: create a fresh API key for testing ===

You need a helper SQL function that mints an API key (returns plaintext once,
stores only its hash + prefix). Check if it exists:

  SELECT proname FROM pg_proc WHERE proname = 'create_api_key_safe';

If it exists, run:

  SELECT public.create_api_key_safe(
    'PASTE_USER_ID_FROM_STEP_A',
    'test-recent-drafts-key'
  ) AS plaintext_key;

Copy the plaintext_key.

If create_api_key_safe does NOT exist, you can:
  (a) Use the frontend's extension UI to mint a key, OR
  (b) Manually insert into api_keys table using the SQL from migration 010:

    INSERT INTO public.api_keys (user_id, name, key_hash, key_prefix)
    VALUES (
      'PASTE_USER_ID_FROM_STEP_A',
      'test-recent-drafts-key',
      '<sha256_hashed_with_salt>',
      'first8chars'
    )
    RETURNING *;

The plaintext key is then 'first8chars' + a random suffix that matches the hash.
You can't reconstruct the suffix from the hash, so option (a) is strongly preferred.

=== STEP C: hit the API endpoints from PowerShell ===

Prerequisites:
  - Frontend dev server running on http://localhost:3000
  - The plaintext API key from Step B exported as a PowerShell env var

Commands (paste each separately):

  # Set API key
  $env:API_KEY = 'PASTE_KEY_FROM_STEP_B'

  # C-1. GET /api/extension/recent-drafts
  curl -X GET "http://localhost:3000/api/extension/recent-drafts?limit=5" `
    -H "Authorization: Bearer $env:API_KEY"

  # Expected response (JSON, HTTP 200):
  # {
  #   "drafts": [
  #     {
  #       "id": "<uuid>",
  #       "content": "TEST_PUBLISHED_CONTENT_v1",
  #       "images": [],
  #       "target_id": null,
  #       "target_type": "auto",
  #       "published_at": "2026-...Z",
  #       "has_images": false
  #     }
  #   ]
  # }

  # C-2. GET /api/extension/settings
  curl -X GET "http://localhost:3000/api/extension/settings" `
    -H "Authorization: Bearer $env:API_KEY"

  # Expected response (HTTP 200): rate_limits, auto_preview=false, preview_delay_seconds=10

  # C-3. PATCH /api/extension/settings
  curl -X PATCH "http://localhost:3000/api/extension/settings" `
    -H "Authorization: Bearer $env:API_KEY" `
    -H "Content-Type: application/json" `
    -d '{"auto_preview":true,"preview_delay_seconds":15}'

  # Expected response: { "ok": true } (HTTP 200)

=== STEP D: optional — verify DB state after API calls ===

Run these queries in SQL Editor:

  -- C-2 verify settings row was returned correctly:
  SELECT * FROM public.extension_user_settings
   WHERE user_id = 'PASTE_USER_ID_FROM_STEP_A';

  -- C-3 verify PATCH actually wrote the values:
  SELECT rate_limits, auto_preview, preview_delay_seconds
    FROM public.extension_user_settings
   WHERE user_id = 'PASTE_USER_ID_FROM_STEP_A';
*/