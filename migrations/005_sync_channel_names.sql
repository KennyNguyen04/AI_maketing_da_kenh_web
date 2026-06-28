-- ============================================================
-- Migration: Sync Channel Names
-- Chuyển 'twitter' -> 'x' để đồng bộ với Extension
-- ============================================================

-- 1. Update drafts channel: twitter -> x
UPDATE public.drafts 
SET channel = 'x' 
WHERE channel = 'twitter';

-- 2. Update drafts channel: linkedin_post -> facebook (hoặc xóa)
-- Giả sử chuyển thành facebook, hoặc có thể xóa
-- UPDATE public.drafts SET channel = 'facebook' WHERE channel = 'linkedin_post';

-- 3. Update repurpose_jobs channels array: twitter -> x
UPDATE public.repurpose_jobs 
SET channels = ARRAY_REPLACE(channels, 'twitter', 'x')
WHERE 'twitter' = ANY(channels);

-- 4. Thêm index cho việc query nhanh
CREATE INDEX IF NOT EXISTS idx_drafts_user_channel 
ON public.drafts(user_id, channel);

-- 5. Thêm cột images vào drafts nếu chưa có (cho extension)
ALTER TABLE public.drafts 
ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';

-- 6. Thêm cột target_id vào drafts cho group/page targeting
ALTER TABLE public.drafts 
ADD COLUMN IF NOT EXISTS target_id TEXT;
