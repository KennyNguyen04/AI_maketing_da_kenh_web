-- ============================================================
-- Migration 010: Add key_prefix to api_keys for O(1) lookup
--
-- Bug fix: extension auth was using `.order('created_at', desc).limit(1)`
-- which caused multi-user conflicts (any user's token could auth as
-- whichever user created the latest key).
--
-- Strategy: store an unencrypted 8-char prefix of the token
-- (e.g. "amp_abc1") as a queryable index. Auth flow:
--   1. Compute prefix from incoming token
--   2. Query api_keys WHERE key_prefix = prefix (cheap, indexed)
--   3. Verify full hash against the few candidates (constant-time)
-- ============================================================

ALTER TABLE public.api_keys
ADD COLUMN IF NOT EXISTS key_prefix TEXT;

-- Backfill: existing keys get empty prefix. They can still be auth'd
-- via the fallback scan path, but new keys will use the fast lookup.
UPDATE public.api_keys SET key_prefix = '' WHERE key_prefix IS NULL;

-- Index for fast prefix lookup. Partial index excludes empty prefixes
-- so the scan fallback handles legacy keys efficiently.
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix
ON public.api_keys(key_prefix)
WHERE key_prefix IS NOT NULL AND key_prefix <> '';