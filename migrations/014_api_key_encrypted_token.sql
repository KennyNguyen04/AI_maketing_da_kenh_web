-- ============================================================
-- Migration 014: Add encrypted_token to api_keys for "show again" UX
--
-- Previously: api_keys stored only hash → user could not retrieve
-- plaintext after page refresh (security by design, but poor UX).
--
-- Now: store both hash (for auth verification) AND encrypted_token
-- (AES-256-GCM with TOKEN_ENCRYPTION_KEY from env).
--
-- Auth path unchanged: still uses hash. Encrypted column only used
-- by the user-facing settings page to show the token on demand.
-- ============================================================

ALTER TABLE public.api_keys
ADD COLUMN IF NOT EXISTS encrypted_token TEXT;