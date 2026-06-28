-- ============================================================
-- Migration: Add display_name to brand_vaults
-- Run in Supabase SQL Editor (supabase.com -> SQL Editor)
-- ============================================================

-- 1. Thêm cột display_name để hiển thị tên vault trong dropdown
ALTER TABLE public.brand_vaults
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Cập nhật existing vaults: display_name = name nếu chưa có
UPDATE public.brand_vaults
SET display_name = name
WHERE display_name IS NULL;

-- 3. Set NOT NULL constraint sau khi đã fill data
ALTER TABLE public.brand_vaults
ALTER COLUMN display_name SET NOT NULL;

-- 4. Index để query nhanh khi list vaults
CREATE INDEX IF NOT EXISTS idx_brand_vaults_user_active
ON public.brand_vaults(user_id, is_active, created_at DESC);
