-- ============================================================
-- Remove LinkedIn from extension_tasks channel options
-- ============================================================

-- Update CHECK constraint on extension_tasks
ALTER TABLE public.extension_tasks DROP CONSTRAINT IF EXISTS extension_tasks_channel_check;
ALTER TABLE public.extension_tasks ADD CONSTRAINT extension_tasks_channel_check 
  CHECK (channel IN ('facebook', 'facebook-group', 'x', 'threads', 'instagram'));

-- Update CHECK constraint on social_targets
ALTER TABLE public.social_targets DROP CONSTRAINT IF EXISTS social_targets_channel_check;
ALTER TABLE public.social_targets ADD CONSTRAINT social_targets_channel_check 
  CHECK (channel IN ('facebook', 'x', 'threads', 'instagram'));
