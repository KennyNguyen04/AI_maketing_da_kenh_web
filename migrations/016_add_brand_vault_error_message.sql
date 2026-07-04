-- ============================================================
-- Migration: 016_add_brand_vault_error_message.sql
-- Add error_message column so workers can persist failure reasons
-- to enable clearer frontend error reporting in the onboarding flow.
-- Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.brand_vaults
ADD COLUMN IF NOT EXISTS error_message TEXT;

COMMENT ON COLUMN public.brand_vaults.error_message IS
  'Set by workers when async analysis (e.g. URL scraping, AI generation) fails. Null on success.';
