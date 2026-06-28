-- ============================================================
-- Migration: Add new channels to drafts table
-- ============================================================

-- 1. Drop old CHECK constraint
ALTER TABLE public.drafts DROP CONSTRAINT IF EXISTS drafts_channel_check;

-- 2. Add new CHECK constraint với các channel mới
ALTER TABLE public.drafts ADD CONSTRAINT drafts_channel_check 
  CHECK (channel IN ('facebook', 'x', 'threads', 'instagram', 'facebook-group'));
