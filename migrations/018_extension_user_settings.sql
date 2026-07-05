-- Migration: 018_extension_user_settings.sql
-- Per-user extension configuration:
--   - rate_limits: JSONB with per-channel post limits (perDay, perHour, minIntervalS, enabled)
--   - auto_preview: show preview before each post (Phase 3.3)
--   - preview_delay_seconds: countdown before auto-confirm (Phase 3.3)
--
-- Defaults are intentionally generic; webapp / extension sends full JSONB on PATCH.

CREATE TABLE IF NOT EXISTS public.extension_user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rate_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  auto_preview BOOLEAN NOT NULL DEFAULT false,
  preview_delay_seconds INT NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_preview_delay_range CHECK (preview_delay_seconds BETWEEN 0 AND 300)
);

ALTER TABLE public.extension_user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own settings" ON public.extension_user_settings;
CREATE POLICY "Users manage own settings"
  ON public.extension_user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-create a default row on user signup so reads always succeed.
-- Uses INSERT ... ON CONFLICT to keep idempotency if the trigger fires twice.
CREATE OR REPLACE FUNCTION public.handle_new_user_extension_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.extension_user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger only attached if it doesn't already exist on auth.users.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_extension_settings'
  ) THEN
    CREATE TRIGGER on_auth_user_created_extension_settings
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_extension_settings();
  END IF;
END
$$;
