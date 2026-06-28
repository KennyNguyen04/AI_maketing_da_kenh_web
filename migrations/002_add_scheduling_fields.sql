-- ============================================================
-- Migration: Add Scheduling Fields to Drafts
-- Run in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- 1. Thêm cột scheduled_for để lưu thời gian đăng bài
ALTER TABLE public.drafts 
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- 2. Thêm cột publish_status để theo dõi trạng thái đăng bài
-- Values: 'draft' (chưa đăng), 'scheduled' (đã lên lịch), 'published' (đã đăng), 'failed' (thất bại)
ALTER TABLE public.drafts 
ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'draft' 
CHECK (publish_status IN ('draft', 'scheduled', 'published', 'failed'));

-- 3. Thêm index cho scheduled_for để query nhanh
CREATE INDEX IF NOT EXISTS idx_drafts_scheduled_for 
ON public.drafts(scheduled_for) 
WHERE scheduled_for IS NOT NULL;

-- 4. Thêm index cho publish_status để filter nhanh
CREATE INDEX IF NOT EXISTS idx_drafts_publish_status 
ON public.drafts(publish_status);

-- 5. Thêm composite index cho việc query drafts cần publish
CREATE INDEX IF NOT EXISTS idx_drafts_to_publish 
ON public.drafts(scheduled_for) 
WHERE publish_status = 'scheduled' AND scheduled_for IS NOT NULL AND scheduled_for <= now();
