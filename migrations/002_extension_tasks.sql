-- ============================================================
-- Amplify — Extension Tasks Migration
-- Thêm bảng extension_tasks để Chrome Extension lấy task
-- ============================================================

-- Bảng api_keys: quản lý API keys cho extension
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own api_keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Bảng extension_tasks: lưu task cho extension xử lý
CREATE TABLE IF NOT EXISTS public.extension_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES public.drafts(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('facebook', 'facebook-group', 'x', 'threads', 'instagram')),
  content TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  target_id TEXT,
  target_type TEXT DEFAULT 'auto' CHECK (target_type IN ('auto', 'profile', 'page', 'group')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  priority INT NOT NULL DEFAULT 0,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index cho truy vấn nhanh
CREATE INDEX IF NOT EXISTS idx_extension_tasks_user_status ON public.extension_tasks(user_id, status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_extension_tasks_scheduled ON public.extension_tasks(scheduled_for) WHERE status = 'pending';

-- RLS
ALTER TABLE public.extension_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks" ON public.extension_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON public.extension_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON public.extension_tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- Function để auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_extension_tasks_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER extension_tasks_updated_at
  BEFORE UPDATE ON public.extension_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_extension_tasks_updated();

-- ============================================================
-- Bảng social_targets: lưu targets (groups, pages) cho extension
-- ============================================================
CREATE TABLE IF NOT EXISTS public.social_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('facebook', 'x', 'threads', 'instagram')),
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'group' CHECK (target_type IN ('group', 'page', 'profile')),
  name TEXT NOT NULL,
  url TEXT,
  description TEXT,
  member_count INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_post_enabled BOOLEAN NOT NULL DEFAULT false,
  schedule JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel, target_id)
);

CREATE INDEX IF NOT EXISTS idx_social_targets_user_channel ON public.social_targets(user_id, channel) WHERE is_active = true;

ALTER TABLE public.social_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own social_targets" ON public.social_targets
  FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_social_targets_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER social_targets_updated_at
  BEFORE UPDATE ON public.social_targets
  FOR EACH ROW EXECUTE FUNCTION public.handle_social_targets_updated();
