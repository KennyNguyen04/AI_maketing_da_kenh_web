-- ============================================================
-- Amplify — Database Schema
-- Chạy trong Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- 1. Bảng profiles (tự tạo khi user đăng ký)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_initials TEXT DEFAULT 'U',
  user_plan TEXT NOT NULL DEFAULT 'free' CHECK (user_plan IN ('free', 'pro', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Bảng brand_vaults
CREATE TABLE public.brand_vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Brand',
  voice_profile JSONB,
  system_prompt TEXT,
  source_type TEXT NOT NULL DEFAULT 'text' CHECK (source_type IN ('url', 'text', 'form')),
  raw_input TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Bảng repurpose_jobs
CREATE TABLE public.repurpose_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_vault_id UUID REFERENCES public.brand_vaults(id),
  title TEXT,
  source_type TEXT NOT NULL DEFAULT 'text' CHECK (source_type IN ('url', 'text')),
  source_content TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Bảng drafts
CREATE TABLE public.drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.repurpose_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('linkedin_post', 'linkedin_thread', 'facebook', 'twitter')),
  content TEXT NOT NULL DEFAULT '',
  is_edited BOOLEAN NOT NULL DEFAULT false,
  is_done BOOLEAN NOT NULL DEFAULT false,
  is_current BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Bảng social_accounts (kết nối X/Facebook Page)
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('x', 'facebook')),
  external_account_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'profile' CHECK (account_type IN ('profile', 'page')),
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, external_account_id)
);

-- 6. Bảng publish_attempts (theo dõi lần publish/fallback)
CREATE TABLE public.publish_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('x', 'facebook')),
  target_id TEXT,
  target_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'publishing', 'published', 'failed')),
  external_post_id TEXT,
  external_post_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Bảng alpha_feedback (thu feedback nội bộ cho chuyên đề)
CREATE TABLE public.alpha_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  category TEXT DEFAULT 'general',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repurpose_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alpha_feedback ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Brand Vaults: users can CRUD their own vaults
CREATE POLICY "Users can view own brand vaults"
  ON public.brand_vaults FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand vaults"
  ON public.brand_vaults FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand vaults"
  ON public.brand_vaults FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand vaults"
  ON public.brand_vaults FOR DELETE
  USING (auth.uid() = user_id);

-- Repurpose Jobs: users can CRUD their own jobs
CREATE POLICY "Users can view own jobs"
  ON public.repurpose_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON public.repurpose_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.repurpose_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Drafts: users can CRUD their own drafts
CREATE POLICY "Users can view own drafts"
  ON public.drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts"
  ON public.drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own drafts"
  ON public.drafts FOR UPDATE
  USING (auth.uid() = user_id);

-- Social accounts: users manage their own connected accounts
CREATE POLICY "Users can view own social accounts"
  ON public.social_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social accounts"
  ON public.social_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social accounts"
  ON public.social_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social accounts"
  ON public.social_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Publish attempts: users view/create their own publish history
CREATE POLICY "Users can view own publish attempts"
  ON public.publish_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own publish attempts"
  ON public.publish_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own publish attempts"
  ON public.publish_attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- Alpha feedback: users can submit/view their own feedback
CREATE POLICY "Users can view own alpha feedback"
  ON public.alpha_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alpha feedback"
  ON public.alpha_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Trigger: Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_initials)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 2))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Indexes for performance
-- ============================================================

CREATE INDEX idx_brand_vaults_user_id ON public.brand_vaults(user_id);
CREATE INDEX idx_brand_vaults_active ON public.brand_vaults(user_id, is_active);
CREATE INDEX idx_repurpose_jobs_user_id ON public.repurpose_jobs(user_id);
CREATE INDEX idx_repurpose_jobs_status ON public.repurpose_jobs(user_id, status);
CREATE INDEX idx_drafts_job_id ON public.drafts(job_id);
CREATE INDEX idx_drafts_current ON public.drafts(job_id, is_current);
CREATE INDEX idx_social_accounts_user_provider ON public.social_accounts(user_id, provider);
CREATE INDEX idx_publish_attempts_draft_id ON public.publish_attempts(draft_id);
CREATE INDEX idx_publish_attempts_user_provider ON public.publish_attempts(user_id, provider);
CREATE INDEX idx_alpha_feedback_created_at ON public.alpha_feedback(created_at DESC);

-- ============================================================
-- Updated_at auto-update trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_brand_vaults
  BEFORE UPDATE ON public.brand_vaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_drafts
  BEFORE UPDATE ON public.drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_social_accounts
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_publish_attempts
  BEFORE UPDATE ON public.publish_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
