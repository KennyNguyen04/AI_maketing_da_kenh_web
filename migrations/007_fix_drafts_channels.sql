-- ============================================================
-- Migration: Fix drafts channel constraint
-- ============================================================

-- 1. Kiểm tra các channel không hợp lệ
SELECT DISTINCT channel FROM public.drafts 
WHERE channel NOT IN ('facebook', 'x', 'threads', 'instagram', 'facebook-group', 'linkedin_post', 'linkedin_thread', 'twitter');

-- 2. Xem tất cả channel hiện có
SELECT DISTINCT channel, COUNT(*) FROM public.drafts GROUP BY channel;

-- 3. Update các channel cũ về giá trị hợp lệ
UPDATE public.drafts SET channel = 'x' WHERE channel = 'twitter';
UPDATE public.drafts SET channel = 'facebook' WHERE channel = 'linkedin_post';
-- Hoặc xóa các row không hợp lệ:
-- DELETE FROM public.drafts WHERE channel NOT IN ('facebook', 'x', 'threads', 'instagram', 'facebook-group');

-- 4. Sau đó mới update constraint
ALTER TABLE public.drafts DROP CONSTRAINT IF EXISTS drafts_channel_check;
ALTER TABLE public.drafts ADD CONSTRAINT drafts_channel_check 
  CHECK (channel IN ('facebook', 'x', 'threads', 'instagram', 'facebook-group'));
