-- Migration: 008_add_idempotency_key
-- Adds idempotency_key column to repurpose_jobs for safe POST retry

ALTER TABLE repurpose_jobs
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Index for fast idempotency lookup
CREATE INDEX IF NOT EXISTS idx_repurpose_jobs_idempotency_key
ON repurpose_jobs(user_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;
